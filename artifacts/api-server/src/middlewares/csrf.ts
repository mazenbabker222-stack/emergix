import type { RequestHandler } from 'express';
import { sendError } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for our own cookie-authenticated endpoints (Better Auth does its own origin
 * check): state-changing requests must come from an allowed Origin. Requests without an Origin
 * header are only accepted when they carry no cookies (so they cannot ride a browser session).
 * Cookies are also SameSite=Lax, httpOnly and Secure in production.
 */
export const originGuard =
  (allowedOrigins: readonly string[]): RequestHandler =>
  (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin) {
      if (allowedOrigins.includes(origin)) return next();
      return void sendError(res, 403, 'csrf_origin_rejected', 'Request origin is not allowed.');
    }
    if (req.get('cookie')) return void sendError(res, 403, 'csrf_origin_missing', 'Request origin is required.');
    next();
  };
