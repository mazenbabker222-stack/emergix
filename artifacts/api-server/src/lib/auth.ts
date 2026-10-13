import { accounts, db, sessions, twoFactors, users, verifications } from '@workspace/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { twoFactor } from 'better-auth/plugins';
import { env } from '../config/env';
import {
  changeEmailMessage,
  resetPasswordMessage,
  verifyEmailMessage,
} from '../emails/templates';
import { writeAudit } from './audit';
import { clearLockout, isEmailLocked, recordFailedSignIn } from './lockout';
import { logger } from './logger';
import { sendEmailInBackground } from './mailer';
import { onSessionCreated } from './sessionLifecycle';

const SIGN_IN_PATH = '/sign-in/email';
const GENERIC_LOCKED_MESSAGE = 'Too many failed attempts. Please try again later.';

const googleConfigured = !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: env.APP_NAME,
  baseURL: env.APP_URL,
  basePath: '/api/auth',
  secret: env.SESSION_SECRET,
  trustedOrigins: [...env.allowedOrigins],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      twoFactor: twoFactors,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      sendEmailInBackground(user.email, `Reset your ${env.APP_NAME} password`, resetPasswordMessage(user.name, url));
    },
    onPasswordReset: async ({ user }) => {
      await writeAudit({ actorId: user.id, action: 'auth.password_reset', entityType: 'user', entityId: user.id });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailInBackground(user.email, `Confirm your ${env.APP_NAME} e-mail address`, verifyEmailMessage(user.name, url));
    },
  },

  socialProviders: googleConfigured
    ? { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! } }
    : {},

  account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },

  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'learner', input: false },
      deletionScheduledAt: { type: 'date', required: false, input: false },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        sendEmailInBackground(user.email, 'Approve your e-mail address change', changeEmailMessage(user.name, newEmail, url));
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },

  plugins: [twoFactor({ issuer: env.APP_NAME })],

  advanced: {
    useSecureCookies: env.isProd,
    cookiePrefix: 'emergixacademy',
    defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: env.isProd },
  },

  // Rate limiting is done in Express (express-rate-limit) so limits are per IP and configurable.
  rateLimit: { enabled: false },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await writeAudit({ actorId: user.id, action: 'auth.sign_up', entityType: 'user', entityId: user.id });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          try {
            await onSessionCreated(session);
          } catch (err) {
            logger.error({ err }, 'session lifecycle hook failed');
          }
        },
      },
    },
  },

  hooks: {
    // Account lockout: refuse sign-in while an e-mail is locked (same generic message for any e-mail).
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_IN_PATH) return;
      const email = (ctx.body as { email?: unknown } | undefined)?.email;
      if (typeof email !== 'string') return;
      if (await isEmailLocked(email)) {
        throw new APIError('TOO_MANY_REQUESTS', { message: GENERIC_LOCKED_MESSAGE });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      const failed = returned instanceof APIError;

      if (ctx.path === SIGN_IN_PATH) {
        const email = (ctx.body as { email?: unknown } | undefined)?.email;
        if (typeof email !== 'string') return;
        if (!failed) {
          await clearLockout(email);
        } else if (returned.statusCode === 401) {
          // Only wrong credentials count; an unverified e-mail (403) does not.
          const state = await recordFailedSignIn(email);
          if (state.lockedUntil) {
            await writeAudit({ action: 'auth.locked_out', entityType: 'user', after: { failedCount: state.failedCount } });
          }
        }
        return;
      }

      if (ctx.path === '/change-password' && !failed) {
        const userId = (returned as { user?: { id?: string } } | undefined)?.user?.id;
        await writeAudit({ actorId: userId ?? null, action: 'auth.password_changed', entityType: 'user', entityId: userId });
      }
    }),
  },
});

export type Auth = typeof auth;
