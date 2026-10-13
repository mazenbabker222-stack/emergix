import { rateLimit } from "express-rate-limit";
import { sendError } from "../lib/errors";

/** 5 contact messages per IP per 15 minutes. Requires `trust proxy` behind Replit/Cloud proxies. */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) =>
    sendError(res, 429, "rate_limited", "Too many messages. Please wait a few minutes and try again."),
});

/** Generous ceiling for all public reads (scrapers, runaway clients). */
export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 429, "rate_limited", "Too many requests. Please slow down."),
});
