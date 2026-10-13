import { hasPermission, hasRole, type Permission, type Role } from '@workspace/auth-shared';
import type { RequestHandler } from 'express';
import { sendError } from '../lib/errors';

/** 401 when there is no valid session. */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.auth) return void sendError(res, 401, 'unauthenticated', 'Please sign in to continue.');
  next();
};

/** 401 when anonymous, 403 when signed in with a role that is not allowed. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, res, next) => {
    if (!req.auth) return void sendError(res, 401, 'unauthenticated', 'Please sign in to continue.');
    if (!hasRole(req.auth.user.role, roles)) return void sendError(res, 403, 'forbidden', 'You do not have access to this resource.');
    next();
  };

/** Preferred over requireRole: asks the central permission matrix. */
export const requirePermission =
  (permission: Permission): RequestHandler =>
  (req, res, next) => {
    if (!req.auth) return void sendError(res, 401, 'unauthenticated', 'Please sign in to continue.');
    if (!hasPermission(req.auth.user.role, permission)) return void sendError(res, 403, 'forbidden', 'You do not have access to this resource.');
    next();
  };

/**
 * Placeholder until billing (phase 08): requires a signed-in user and allows the request.
 * Replace the body with a real entitlement lookup for `examId`; callers will not change.
 */
export const requireEntitlement =
  (_examId: string): RequestHandler =>
  (req, res, next) => {
    if (!req.auth) return void sendError(res, 401, 'unauthenticated', 'Please sign in to continue.');
    next();
  };
