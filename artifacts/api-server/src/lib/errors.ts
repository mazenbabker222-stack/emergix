import type { Response } from 'express';

/** Standard error shape: { error: { code, message, details? } } (see ErrorResponse in openapi.yaml). */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}
