import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import pinoHttp from "pino-http";
import router from "./routes";
import { env } from "./config/env";
import { auth } from "./lib/auth";
import { logger } from "./lib/logger";
import { originGuard } from "./middlewares/csrf";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { attachSession } from "./middlewares/session";

const app: Express = express();

// One proxy hop (Replit / load balancer) so req.ip and Secure cookies are correct.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          // No query strings, and no one-time tokens carried in the path.
          url: req.url?.split("?")[0]?.replace(/(reset-password\/)[^/]+/, "$1[redacted]"),
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Built web app (production outside Replit): the API serves the Vite bundle from the same origin,
// so cookies work. Mounted before helmet to match the static hosting used on Replit.
const webDir = path.resolve(process.cwd(), process.env.WEB_DIST_DIR ?? "../oscepass/dist/public");
const serveWeb = env.isProd && fs.existsSync(path.join(webDir, "index.html"));
if (serveWeb) {
  app.use(express.static(webDir, { index: false, maxAge: "1h" }));
}

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || env.allowedOrigins.includes(origin)),
    credentials: true,
  }),
);

const limiterMessage = {
  error: { code: "rate_limited", message: "Too many requests. Please slow down and try again later." },
};
const limiter = (limit: number) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: "draft-7", legacyHeaders: false, message: limiterMessage });

// Better Auth must see the raw body, so it is mounted BEFORE express.json().
app.use("/api/auth", limiter(env.AUTH_RATE_LIMIT_MAX));
app.use(
  [
    "/api/auth/sign-in",
    "/api/auth/sign-up",
    "/api/auth/request-password-reset",
    "/api/auth/forget-password",
    "/api/auth/send-verification-email",
    "/api/auth/two-factor/verify-totp",
    "/api/auth/two-factor/verify-backup-code",
  ],
  limiter(env.AUTH_STRICT_RATE_LIMIT_MAX),
);
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(attachSession);
app.use("/api", originGuard(env.allowedOrigins));

app.use("/api", router);

// JSON 404 for unknown API routes, then the single error handler (standard { error } shape).
app.use("/api", notFoundHandler);
if (serveWeb) {
  // SPA fallback: any other GET returns index.html so client-side routes work on refresh.
  app.get("/*splat", (_req, res) => res.sendFile(path.join(webDir, "index.html")));
}
app.use(errorHandler);

export default app;
