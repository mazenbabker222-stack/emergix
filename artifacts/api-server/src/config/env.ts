import { randomBytes } from 'node:crypto';
import { z } from 'zod/v4';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const isProductionProcess = process.env.NODE_ENV === 'production';
const developmentAppUrl = !isProductionProcess && process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'http://localhost:5173';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_URL: z.url().default(developmentAppUrl),
  /** Used in e-mails and the 2FA issuer. The web app's brand lives in src/config/brand.ts. */
  APP_NAME: z.string().min(1).default('Emergix Academy'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),
  EMAIL_FROM: z.string().default('Emergix Academy <no-reply@emergix-academy.example>'),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.email().optional().transform((value) => value?.trim().toLowerCase()),
  ADMIN_BOOTSTRAP_TOKEN: z.string().min(32).max(256).optional(),
  /** Inbox that receives contact-form messages (phase 04). Messages are always stored; without this they are not e-mailed. */
  SUPPORT_EMAIL: z.email().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EXTRA_ALLOWED_ORIGINS: z.string().optional(),
  MAX_SESSIONS: z.coerce.number().int().min(1).default(2),
  LOCKOUT_THRESHOLD: z.coerce.number().int().min(1).default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().min(1).default(15),
  DELETION_COOLDOWN_DAYS: z.coerce.number().int().min(0).default(7),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  AUTH_STRICT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  /** Local development only: print e-mails (which contain one-time links) to the console. */
  DEV_PRINT_EMAILS: bool,
  /** Test only: exposes GET /api/test/outbox. Ignored in production. */
  E2E_TEST_HOOKS: bool,
});

// Treat empty strings (e.g. `RESEND_API_KEY=` copied from .env.example) as unset.
const source = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''));
const parsed = schema.safeParse(source);

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${problems}`);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === 'production';

if (isProd && !raw.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production.');
}

if (isProd && raw.APP_URL === 'http://localhost:5173') {
  throw new Error('APP_URL must be set to the published app origin in production.');
}

export const env = {
  ...raw,
  isProd,
  // Without a configured secret (development only) sessions reset on every restart.
  SESSION_SECRET: raw.SESSION_SECRET ?? randomBytes(32).toString('hex'),
  appOrigin: new URL(raw.APP_URL).origin,
  allowedOrigins: [
    new URL(raw.APP_URL).origin,
    ...(raw.EXTRA_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ],
  testHooksEnabled: raw.E2E_TEST_HOOKS && !isProd,
} as const;
