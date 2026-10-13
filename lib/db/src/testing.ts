import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema";
import { runSeed } from "./seed";

const MIGRATIONS_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** Connection string of the dedicated test database. Refuses anything that could be the dev/prod database. */
export function testDatabaseUrl(): string {
  const url = process.env["DATABASE_URL_TEST"];
  if (!url) throw new Error("DATABASE_URL_TEST is not set. Point it at a separate, disposable Postgres database.");
  if (url === process.env["DATABASE_URL"]) throw new Error("DATABASE_URL_TEST must differ from DATABASE_URL.");
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) throw new Error(`Test database name must contain "test" (got "${dbName}"). Refusing to wipe it.`);
  return url;
}

/**
 * Wipe the test database, apply the committed migrations (lib/db/migrations) and optionally seed it.
 * Run `pnpm --filter @workspace/db run generate` once (and commit the output) before using this.
 */
export async function resetTestDatabase(options: { seed?: boolean } = {}): Promise<void> {
  const pool = new pg.Pool({ connectionString: testDatabaseUrl() });
  try {
    await pool.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    if (options.seed !== false) await runSeed(db);
  } finally {
    await pool.end();
  }
}
