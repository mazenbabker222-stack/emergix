/**
 * Phase 06 migration, step 2: load the structured station JSON (produced by osce:extract) and
 * the topic catalogue into Postgres. Idempotent: safe to run again after editing the JSON.
 *
 *   pnpm --filter @workspace/scripts run osce:seed
 *
 * - Ready stations are upserted by slug, with their marking domains (matched by position so
 *   domain ids, and therefore saved attempts, survive a re-seed).
 * - Every other neurology topic from the old hub becomes a "coming soon" station row, which is
 *   how the topic list shows up in the library.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db, osceMarkingDomainsTable, osceStationsTable, pool } from "@workspace/db";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const seedDir = path.join(root, "lib", "db", "seed", "osce");

interface StationFile {
  slug: string;
  title: string;
  specialty: string;
  topicGroup: string;
  summary: string;
  image: string;
  difficulty: "foundation" | "core" | "advanced";
  timing: { readingSeconds: number; historySeconds: number; examinerSeconds: number };
  totalMarks: number;
  domains: { domain: string; descriptor: string; maxMarks: number }[];
  content: Record<string, unknown>;
}

interface Catalogue {
  specialty: { slug: string; name: string };
  groups: { slug: string; name: string; position: number; topics: { title: string; slug: string; ready: boolean }[] }[];
}

async function main() {
  const catalogue = JSON.parse(await readFile(path.join(seedDir, "catalogue.json"), "utf8")) as Catalogue;
  const files = (await readdir(path.join(seedDir, "stations"))).filter((f) => f.endsWith(".json")).sort();
  const stations: StationFile[] = [];
  for (const f of files) stations.push(JSON.parse(await readFile(path.join(seedDir, "stations", f), "utf8")));

  const groupSlugByName = new Map(catalogue.groups.map((g) => [g.name, g.slug]));
  const order = new Map<string, number>();
  catalogue.groups.forEach((g) => g.topics.forEach((t, i) => order.set(t.slug, g.position * 100 + i)));

  let ready = 0;
  let comingSoon = 0;

  await db.transaction(async (tx) => {
    for (const s of stations) {
      const values = {
        slug: s.slug,
        title: s.title,
        specialty: s.specialty,
        topicGroup: s.topicGroup,
        topicGroupSlug: groupSlugByName.get(s.topicGroup) ?? null,
        summary: s.summary,
        image: s.image,
        difficulty: s.difficulty,
        stationStatus: "ready",
        sortOrder: order.get(s.slug) ?? 0,
        readingSeconds: s.timing.readingSeconds,
        historySeconds: s.timing.historySeconds,
        examinerSeconds: s.timing.examinerSeconds,
        totalMarks: s.totalMarks,
        content: s.content,
        deletedAt: null,
      };
      const [row] = await tx
        .insert(osceStationsTable)
        .values(values)
        .onConflictDoUpdate({ target: osceStationsTable.slug, set: values })
        .returning({ id: osceStationsTable.id });
      const stationId = row!.id;
      for (const [position, d] of s.domains.entries()) {
        const dv = { stationId, position, domain: d.domain, descriptor: d.descriptor, maxMarks: d.maxMarks };
        await tx
          .insert(osceMarkingDomainsTable)
          .values(dv)
          .onConflictDoUpdate({
            target: [osceMarkingDomainsTable.stationId, osceMarkingDomainsTable.position],
            set: { domain: dv.domain, descriptor: dv.descriptor, maxMarks: dv.maxMarks },
          });
      }
      await tx
        .delete(osceMarkingDomainsTable)
        .where(and(eq(osceMarkingDomainsTable.stationId, stationId), gt(osceMarkingDomainsTable.position, s.domains.length - 1)));
      ready++;
    }

    const readySlugs = new Set(stations.map((s) => s.slug));
    for (const group of catalogue.groups) {
      for (const topic of group.topics) {
        if (readySlugs.has(topic.slug)) continue;
        const values = {
          slug: topic.slug,
          title: topic.title,
          specialty: catalogue.specialty.slug,
          topicGroup: group.name,
          topicGroupSlug: group.slug,
          stationStatus: "coming_soon",
          sortOrder: order.get(topic.slug) ?? 0,
        };
        // Never downgrade a station that has since been authored.
        await tx
          .insert(osceStationsTable)
          .values(values)
          .onConflictDoUpdate({
            target: osceStationsTable.slug,
            set: {
              title: values.title,
              topicGroup: values.topicGroup,
              topicGroupSlug: values.topicGroupSlug,
              sortOrder: values.sortOrder,
              stationStatus: values.stationStatus,
            },
          });
        comingSoon++;
      }
    }
  });

  // Round-trip check: what is in the database must equal what is in the JSON files.
  const rows = await db.select().from(osceStationsTable).where(inArray(osceStationsTable.slug, stations.map((s) => s.slug)));
  let mismatches = 0;
  for (const s of stations) {
    const row = rows.find((r) => r.slug === s.slug);
    const domains = row
      ? await db.select().from(osceMarkingDomainsTable).where(eq(osceMarkingDomainsTable.stationId, row.id)).orderBy(asc(osceMarkingDomainsTable.position))
      : [];
    const same =
      row !== undefined &&
      isDeepStrictEqual(row.content, s.content) &&
      domains.length === s.domains.length &&
      domains.every((d, i) => d.domain === s.domains[i]!.domain && d.maxMarks === s.domains[i]!.maxMarks) &&
      domains.reduce((sum, d) => sum + d.maxMarks, 0) === s.totalMarks;
    if (!same) {
      mismatches++;
      console.error(`MISMATCH after seeding: ${s.slug}`);
    }
  }
  console.log(`Seeded ${ready} ready stations and ${comingSoon} coming-soon topics. Round-trip mismatches: ${mismatches}.`);
  await pool.end();
  if (mismatches) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
