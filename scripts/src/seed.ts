/**
 * Idempotent seed: 3 exams, 18 topics (6 + 12 sub-topics), 3 difficulty levels, 60 SAMPLE SBA questions,
 * 3 placeholder plans, 2 sample courses, 5 demo users.
 *
 *   pnpm --filter @workspace/scripts run seed          # seed (safe to re-run)
 *   pnpm --filter @workspace/scripts run seed:check    # seed, then fail if row counts differ from the expected list
 *
 * Demo-user passwords are random, printed ONCE (only when the user is first created) and never written to disk.
 */
import { pool, db } from "@workspace/db";
import { EXPECTED_COUNTS, runSeed, seedCounts } from "@workspace/db/seed";

async function main() {
  if (process.env["NODE_ENV"] === "production" && process.env["SEED_ALLOW_PRODUCTION"] !== "1") {
    throw new Error("Refusing to seed demo data in production. Set SEED_ALLOW_PRODUCTION=1 to override.");
  }
  const { newCredentials } = await runSeed(db);
  const counts = await seedCounts(db);

  console.log("Row counts:", counts);
  if (newCredentials.length > 0) {
    console.log("\nDemo users created. Passwords are shown ONCE; copy them now:\n");
    for (const c of newCredentials) console.log(`  ${c.role.padEnd(10)} ${c.email}  ${c.password}`);
  } else {
    console.log("\nDemo users already exist (passwords unchanged and not shown).");
  }

  if (process.argv.includes("--check")) {
    const bad = (Object.keys(EXPECTED_COUNTS) as (keyof typeof EXPECTED_COUNTS)[]).filter((k) => counts[k] !== EXPECTED_COUNTS[k]);
    if (bad.length > 0) {
      console.error("\nCount mismatch:", bad.map((k) => `${k}: expected ${EXPECTED_COUNTS[k]}, got ${counts[k]}`).join("; "));
      process.exitCode = 1;
    } else {
      console.log("\nAll counts match the expected list.");
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
