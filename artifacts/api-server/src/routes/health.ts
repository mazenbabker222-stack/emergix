import { Router, type IRouter } from "express";
import { HealthCheckResponse, ReadinessCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const READINESS_TIMEOUT_MS = 3000;

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Readiness: can we reach Postgres? @workspace/db is imported lazily so that
// /healthz (liveness) keeps working even when DATABASE_URL is not configured.
router.get("/readyz", async (req, res) => {
  try {
    const { pool } = await import("@workspace/db");
    await Promise.race([
      pool.query("select 1"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("database check timed out")), READINESS_TIMEOUT_MS),
      ),
    ]);
    res.json(ReadinessCheckResponse.parse({ status: "ok" }));
  } catch (err) {
    req.log.error({ err }, "readiness check failed");
    res.status(503).json(ReadinessCheckResponse.parse({ status: "unavailable" }));
  }
});

export default router;
