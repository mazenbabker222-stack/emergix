import { normaliseRole } from '@workspace/auth-shared';
import { fromNodeHeaders } from 'better-auth/node';
import type { RequestHandler } from 'express';
import { auth } from '../lib/auth';

/** Loads the session (if any) from the cookie into `req.auth`. Never rejects anonymous requests. */
export const attachSession: RequestHandler = async (req, _res, next) => {
  try {
    const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (result) {
      const u = result.user as typeof result.user & { role?: unknown; twoFactorEnabled?: boolean | null };
      req.auth = {
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: u.emailVerified,
          role: normaliseRole(u.role),
          twoFactorEnabled: !!u.twoFactorEnabled,
        },
        session: { id: result.session.id, token: result.session.token, expiresAt: result.session.expiresAt },
      };
    }
    next();
  } catch (err) {
    next(err);
  }
};
