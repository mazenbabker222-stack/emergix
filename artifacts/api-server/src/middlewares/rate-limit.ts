import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

/**
 * Small in-memory fixed-window limiter, keyed by visitor id (or IP). Enough for one instance;
 * phase 11 replaces it with a shared store. No dependencies on purpose.
 */
export function rateLimit(options: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.auth?.user.id ?? req.ip ?? "unknown";
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      return next();
    }
    entry.count++;
    if (entry.count > options.max) {
      return next(new HttpError(429, "rate_limited", "Too many requests, please slow down"));
    }
    next();
  };
}
