import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  ClearOsceDraftParams,
  CreateOsceStationAttemptBody,
  CreateOsceStationAttemptParams,
  DeleteOsceAttemptParams,
  GetOsceDraftParams,
  ListOsceAttemptsQueryParams,
  SaveOsceDraftBody,
  SaveOsceDraftParams,
} from "@workspace/api-zod";
import { validateMarks } from "@workspace/osce-core";
import { db, osceAttemptsTable, osceStationsTable, type OsceMarkingDomain, type OsceStation } from "@workspace/db";
import { badRequest, notFound, parse } from "../../lib/http-error";
import { toAttempt, toDatabaseRating } from "../../lib/osce/serializers";
import { domainsFor, findReadyStation } from "../../lib/osce/stations";
import { actorOf } from "../../lib/osce/actor";
import { rateLimit } from "../../middlewares/rate-limit";
import type { generatedTypes } from "@workspace/api-zod";

const router: IRouter = Router();
type OsceAttempt = generatedTypes.Phase06OsceAttempt;
const writeLimit = rateLimit({ windowMs: 60_000, max: 240 });

interface MarksBody {
  marks: Record<string, number>;
  globalRating?: string | null;
  notes?: string | null;
  mode?: "learning" | "exam";
}

/** Validate marks against the station's domains. Throws 400 with details on failure. */
export function checkMarks(domains: OsceMarkingDomain[], body: MarksBody) {
  const result = validateMarks(domains.map((d) => ({ id: d.id, maxMarks: d.maxMarks })), body.marks);
  if (!result.ok) throw badRequest("Invalid marks", result.errors);
  return result;
}

const draftWhere = (ownerId: string, stationId: string) =>
  and(
    eq(osceAttemptsTable.ownerId, ownerId),
    eq(osceAttemptsTable.stationId, stationId),
    eq(osceAttemptsTable.status, "draft"),
    isNull(osceAttemptsTable.circuitId),
    isNull(osceAttemptsTable.roomId),
  );

router.get("/stations/:slug/draft", async (req, res) => {
  const { slug } = parse(GetOsceDraftParams, req.params);
  const station = await findReadyStation(slug);
  const [row] = await db.select().from(osceAttemptsTable).where(draftWhere(actorOf(req).id, station.id)).limit(1);
  res.json(row ? { attempt: toAttempt(row, station) } : {});
});

router.put("/stations/:slug/draft", writeLimit, async (req, res) => {
  const { slug } = parse(SaveOsceDraftParams, req.params);
  const body = parse(SaveOsceDraftBody, req.body);
  const station = await findReadyStation(slug);
  const marks = checkMarks(await domainsFor(station.id), body);
  const values = {
    ownerId: actorOf(req).id,
    stationId: station.id,
    mode: body.mode ?? "exam",
    status: "draft" as const,
    marks: marks.marks,
    totalMarks: marks.total,
    maxMarks: marks.maxTotal,
    globalRating: toDatabaseRating(body.globalRating),
    notes: body.notes ?? null,
  };
  const [row] = await db
    .insert(osceAttemptsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [osceAttemptsTable.ownerId, osceAttemptsTable.stationId],
      targetWhere: and(eq(osceAttemptsTable.status, "draft"), isNull(osceAttemptsTable.circuitId), isNull(osceAttemptsTable.roomId)),
      set: {
        mode: values.mode,
        marks: values.marks,
        totalMarks: values.totalMarks,
        maxMarks: values.maxMarks,
        globalRating: values.globalRating,
        notes: values.notes,
      },
    })
    .returning();
  res.json(toAttempt(row!, station));
});

router.delete("/stations/:slug/draft", writeLimit, async (req, res) => {
  const { slug } = parse(ClearOsceDraftParams, req.params);
  const station = await findReadyStation(slug);
  await db.delete(osceAttemptsTable).where(draftWhere(actorOf(req).id, station.id));
  res.status(204).end();
});

router.post("/stations/:slug/attempts", writeLimit, async (req, res) => {
  const { slug } = parse(CreateOsceStationAttemptParams, req.params);
  const body = parse(CreateOsceStationAttemptBody, req.body);
  const station = await findReadyStation(slug);
  const marks = checkMarks(await domainsFor(station.id), body);
  const ownerId = actorOf(req).id;
  const row = await db.transaction(async (tx) => {
    // Saving finishes the sheet: the autosaved draft is replaced by a history entry.
    await tx.delete(osceAttemptsTable).where(draftWhere(ownerId, station.id));
    const [saved] = await tx
      .insert(osceAttemptsTable)
      .values({
        ownerId,
        stationId: station.id,
        mode: body.mode ?? "exam",
        status: "saved" as const,
        marks: marks.marks,
        totalMarks: marks.total,
        maxMarks: marks.maxTotal,
        globalRating: toDatabaseRating(body.globalRating),
        notes: body.notes ?? null,
        savedAt: new Date(),
      })
      .returning();
    return saved!;
  });
  res.status(201).json(toAttempt(row, station));
});

router.get("/attempts", async (req, res) => {
  const q = parse(ListOsceAttemptsQueryParams, req.query);
  const conditions = [eq(osceAttemptsTable.ownerId, actorOf(req).id), eq(osceAttemptsTable.status, "saved")];
  if (q.stationSlug) conditions.push(eq(osceStationsTable.slug, q.stationSlug));
  const rows = await db
    .select({ attempt: osceAttemptsTable, station: osceStationsTable })
    .from(osceAttemptsTable)
    .innerJoin(osceStationsTable, eq(osceAttemptsTable.stationId, osceStationsTable.id))
    .where(and(...conditions))
    .orderBy(desc(osceAttemptsTable.createdAt))
    .limit(q.limit);
  res.json({ items: rows.map((r: { attempt: typeof osceAttemptsTable.$inferSelect; station: OsceStation }) => toAttempt(r.attempt, r.station)) });
});

router.delete("/attempts/:id", writeLimit, async (req, res) => {
  const { id } = parse(DeleteOsceAttemptParams, req.params);
  const deleted = await db
    .delete(osceAttemptsTable)
    .where(and(eq(osceAttemptsTable.id, id), eq(osceAttemptsTable.ownerId, actorOf(req).id)))
    .returning({ id: osceAttemptsTable.id });
  if (deleted.length === 0) throw notFound("Attempt not found");
  res.status(204).end();
});

export default router;
