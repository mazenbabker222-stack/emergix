/**
 * Lazy access to @workspace/db. The db package throws at import time when
 * DATABASE_URL is missing, and /healthz (liveness) must keep working without it,
 * so nothing outside this helper imports the package statically.
 */
export const loadDb = () => import("@workspace/db");
export type Db = Awaited<ReturnType<typeof loadDb>>;
