import type { ErrorRequestHandler, RequestHandler } from "express";
import { sendError } from "../lib/errors";
import { HttpError } from "../lib/http-error";

export const notFoundHandler: RequestHandler = (_req, res) => sendError(res, 404, "not_found", "Route not found");

// Express 5 forwards rejected promises from async handlers here.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    if (err.status >= 500) req.log?.error({ err }, "unhandled error");
    const details =
      err.details && typeof err.details === "object" && !Array.isArray(err.details)
        ? (err.details as Record<string, unknown>)
        : undefined;
    return sendError(
      res,
      err.status,
      err.status >= 500 ? "internal_error" : err.code,
      err.status >= 500 ? "Something went wrong. Please try again." : err.message,
      details,
    );
  }
  const status = typeof err?.status === "number" ? err.status : 500;
  if (status === 400 && err?.type === "entity.parse.failed") {
    return sendError(res, 400, "invalid_json", "The request body is not valid JSON");
  }
  if (status === 413) return sendError(res, 413, "payload_too_large", "The request body is too large");
  if (status >= 500) req.log?.error({ err }, "unhandled error");
  // Never leak internals: 5xx messages are generic.
  sendError(
    res,
    status,
    status >= 500 ? "internal_error" : "request_error",
    status >= 500 ? "Something went wrong. Please try again." : String(err?.message ?? "Request error"),
  );
};
