import { BootstrapInitialAdminBody, BootstrapInitialAdminResponse } from "@workspace/api-zod";
import { db, users } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { Router, type IRouter } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { writeAudit } from "../lib/audit";
import { sendError } from "../lib/errors";
import { env } from "../config/env";

const router: IRouter = Router();

const bootstrapLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 429, "rate_limited", "Too many setup attempts. Please wait before trying again."),
});

function matchesToken(candidate: string, configured: string) {
  const candidateBytes = Buffer.from(candidate, "utf8");
  const configuredBytes = Buffer.from(configured, "utf8");
  return candidateBytes.length === configuredBytes.length && timingSafeEqual(candidateBytes, configuredBytes);
}

router.post("/admin", bootstrapLimiter, async (req, res) => {
  if (!env.ADMIN_EMAIL || !env.ADMIN_BOOTSTRAP_TOKEN) {
    return void sendError(res, 503, "bootstrap_disabled", "Initial administrator setup is not enabled.");
  }

  const parsed = BootstrapInitialAdminBody.safeParse(req.body);
  if (!parsed.success) {
    return void sendError(res, 400, "validation_error", "Invalid initial administrator details.", parsed.error.flatten());
  }

  const { name, password, bootstrapToken } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  if (email !== env.ADMIN_EMAIL || !matchesToken(bootstrapToken, env.ADMIN_BOOTSTRAP_TOKEN)) {
    return void sendError(res, 403, "bootstrap_forbidden", "The configured administrator email or setup token was not accepted.");
  }

  const [existingAccount] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, env.ADMIN_EMAIL))
    .limit(1);
  const [existingSuperadmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "superadmin"))
    .limit(1);
  if (existingAccount || existingSuperadmin) {
    return void sendError(res, 409, "bootstrap_already_used", "Initial administrator setup has already been completed.");
  }

  try {
    const result = await auth.api.signUpEmail({
      body: { email: env.ADMIN_EMAIL, name: name.trim(), password },
      headers: fromNodeHeaders(req.headers),
    });

    const [createdAdmin] = await db
      .update(users)
      .set({ role: "superadmin", emailVerified: true })
      .where(and(eq(users.id, result.user.id), eq(users.email, env.ADMIN_EMAIL)))
      .returning({ id: users.id });
    if (!createdAdmin) {
      return void sendError(res, 409, "bootstrap_account_conflict", "The administrator account could not be initialized.");
    }

    await writeAudit({
      actorId: createdAdmin.id,
      action: "admin.bootstrap_created",
      entityType: "user",
      entityId: createdAdmin.id,
      after: { role: "superadmin" },
      ip: req.ip,
    });

    return res.status(201).json(BootstrapInitialAdminResponse.parse({ status: "created", role: "superadmin" }));
  } catch {
    // Do not log request bodies, passwords, or the one-time setup token.
    req.log.error("Initial administrator setup failed.");
    return void sendError(res, 500, "bootstrap_failed", "Initial administrator setup could not be completed.");
  }
});

export default router;
