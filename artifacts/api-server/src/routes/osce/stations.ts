import { Router, type IRouter } from "express";
import { and, asc, count, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import {
  GetOsceStationParams,
  GetOsceStationPreviewParams,
  ListOsceStationsQueryParams,
} from "@workspace/api-zod";
import type { generatedTypes } from "@workspace/api-zod";
import { db, osceStationsTable } from "@workspace/db";
import { forbidden, parse } from "../../lib/http-error";
import { canViewFullStation, domainsFor, findReadyStation, findStationBySlug, PUBLIC_STATUSES } from "../../lib/osce/stations";
import { toDetail, toPreview, toSummary } from "../../lib/osce/serializers";
import { actorOf } from "../../lib/osce/actor";
import { requireAuth } from "../../middlewares/rbac";

const router: IRouter = Router();
type OsceSpecialty = generatedTypes.OsceSpecialty;
type OsceTopicGroup = generatedTypes.OsceTopicGroup;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);
const titleCase = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

router.get("/topics", async (_req, res) => {
  const rows = await db
    .select({
      specialty: osceStationsTable.specialty,
      groupSlug: osceStationsTable.topicGroupSlug,
      groupName: osceStationsTable.topicGroup,
      status: osceStationsTable.stationStatus,
      n: count(),
    })
    .from(osceStationsTable)
    .where(and(isNull(osceStationsTable.deletedAt), inArray(osceStationsTable.stationStatus, [...PUBLIC_STATUSES])))
    .groupBy(osceStationsTable.specialty, osceStationsTable.topicGroupSlug, osceStationsTable.topicGroup, osceStationsTable.stationStatus);

  const specialties = new Map<string, OsceSpecialty>();
  const groups = new Map<string, OsceTopicGroup>();
  for (const r of rows) {
    const sp =
      specialties.get(r.specialty ?? "neurology") ?? { slug: r.specialty ?? "neurology", name: titleCase(r.specialty ?? "neurology"), total: 0, ready: 0, groups: [] };
    specialties.set(r.specialty ?? "neurology", sp);
    const slug = r.groupSlug ?? "other";
    const key = `${r.specialty ?? "neurology"}/${slug}`;
    let g = groups.get(key);
    if (!g) {
      g = { slug, name: r.groupName ?? "Other", total: 0, ready: 0 };
      groups.set(key, g);
      sp.groups.push(g);
    }
    const n = Number(r.n);
    g.total += n;
    sp.total += n;
    if (r.status === "ready") {
      g.ready += n;
      sp.ready += n;
    }
  }
  res.json({ specialties: [...specialties.values()] });
});

router.get("/stations", async (req, res) => {
  const q = parse(ListOsceStationsQueryParams, req.query);
  const conditions = [isNull(osceStationsTable.deletedAt), inArray(osceStationsTable.stationStatus, [...PUBLIC_STATUSES])];
  if (q.specialty) conditions.push(eq(osceStationsTable.specialty, q.specialty));
  if (q.topic) {
    // `topic` may be a specialty slug (e.g. neurology) or a topic group slug (e.g. stroke-and-vascular).
    conditions.push(or(eq(osceStationsTable.specialty, q.topic), eq(osceStationsTable.topicGroupSlug, q.topic))!);
  }
  if (q.difficulty) conditions.push(eq(osceStationsTable.difficulty, q.difficulty));
  if (q.status) conditions.push(eq(osceStationsTable.stationStatus, q.status));
  if (q.q) {
    const pattern = `%${escapeLike(q.q.trim())}%`;
    conditions.push(
      or(ilike(osceStationsTable.title, pattern), ilike(osceStationsTable.topicGroup, pattern), ilike(osceStationsTable.summary, pattern))!,
    );
  }
  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(osceStationsTable)
      .where(where)
      // Ready stations first, then coming-soon topics, each in curriculum order.
      .orderBy(sql`case when ${osceStationsTable.stationStatus} = 'ready' then 0 else 1 end`, asc(osceStationsTable.sortOrder), asc(osceStationsTable.title))
      .limit(q.limit)
      .offset(q.offset),
    db.select({ n: count() }).from(osceStationsTable).where(where),
  ]);
  res.json({ items: rows.map(toSummary), total: Number(totals[0]?.n ?? 0) });
});

router.get("/stations/:slug/preview", async (req, res) => {
  const { slug } = parse(GetOsceStationPreviewParams, req.params);
  const row = await findStationBySlug(slug);
  res.json(toPreview(row, await domainsFor(row.id)));
});

router.get("/stations/:slug", requireAuth, async (req, res) => {
  const { slug } = parse(GetOsceStationParams, req.params);
  const row = await findReadyStation(slug);
  if (!canViewFullStation(actorOf(req), row)) throw forbidden("A subscription is required for the full station", "entitlement_required");
  res.json(toDetail(row, await domainsFor(row.id)));
});

export default router;
