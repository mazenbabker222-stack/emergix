import { asc, eq, and, isNull, inArray } from "drizzle-orm";
import { db, osceMarkingDomainsTable, osceStationsTable, type OsceMarkingDomain, type OsceStation } from "@workspace/db";
import { notFound } from "../http-error";

/** Statuses visible through the public API. Drafts and archived stations are admin-only (phase 09b). */
export const PUBLIC_STATUSES = ["ready", "coming_soon"] as const;

export async function findStationBySlug(slug: string): Promise<OsceStation> {
  const [row] = await db
    .select()
    .from(osceStationsTable)
    .where(and(eq(osceStationsTable.slug, slug), isNull(osceStationsTable.deletedAt), inArray(osceStationsTable.stationStatus, [...PUBLIC_STATUSES])))
    .limit(1);
  if (!row) throw notFound("Station not found", "station_not_found");
  return row;
}

/** A station whose content can be practised (not just a "coming soon" topic). */
export async function findReadyStation(slug: string): Promise<OsceStation> {
  const row = await findStationBySlug(slug);
  if (row.stationStatus !== "ready" || !row.content) throw notFound("This station is not available yet", "station_not_ready");
  return row;
}

export async function domainsFor(stationId: string): Promise<OsceMarkingDomain[]> {
  return db
    .select()
    .from(osceMarkingDomainsTable)
    .where(eq(osceMarkingDomainsTable.stationId, stationId))
    .orderBy(asc(osceMarkingDomainsTable.position));
}

export async function stationsByIds(ids: string[]): Promise<Map<string, OsceStation>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(osceStationsTable).where(inArray(osceStationsTable.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * Entitlement hook. Phase 08 (billing) replaces the body: free users get the preview and a
 * limited set of stations, subscribers get everything. For now every visitor can open every
 * ready station so that phase 06 can be exercised end to end.
 */
export function canViewFullStation(_actor: { id: string; authenticated: boolean }, _station: OsceStation): boolean {
  return true;
}
