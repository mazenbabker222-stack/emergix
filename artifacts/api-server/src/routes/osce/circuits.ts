import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  CreateOsceCircuitBody,
  FinishOsceCircuitParams,
  GetOsceCircuitParams,
  GetOsceCircuitReportParams,
  SaveOsceCircuitMarksBody,
  SaveOsceCircuitMarksParams,
  StartOsceCircuitParams,
} from "@workspace/api-zod";
import type { generatedTypes } from "@workspace/api-zod";
import {
  aggregateByDomainName,
  buildCircuitPlan,
  canSaveMarks,
  CircuitPlanError,
  elapsedSince,
  locate,
  percentage,
  stationIdsOf,
  type CircuitPlan,
} from "@workspace/osce-core";
import {
  db,
  osceAttemptsTable,
  osceCircuitsTable,
  osceMarkingDomainsTable,
  osceStationsTable,
  type OsceCircuit as CircuitRow,
  type OsceStation,
} from "@workspace/db";
import { badRequest, conflict, notFound, parse } from "../../lib/http-error";
import { toAttempt, toDatabaseRating } from "../../lib/osce/serializers";
import { domainsFor, findReadyStation, stationsByIds } from "../../lib/osce/stations";
import { actorOf } from "../../lib/osce/actor";
import { rateLimit } from "../../middlewares/rate-limit";
import { checkMarks } from "./attempts";

const router: IRouter = Router();
type OsceCircuit = generatedTypes.Phase06OsceCircuit;
type OsceCircuitReport = generatedTypes.OsceCircuitReport;
type OsceCircuitState = generatedTypes.OsceCircuitState;
const writeLimit = rateLimit({ windowMs: 60_000, max: 240 });
const createLimit = rateLimit({ windowMs: 60_000, max: 20 });

const planOf = (row: CircuitRow) => row.plan as unknown as CircuitPlan;

function serializeCircuit(row: CircuitRow, stations: Map<string, OsceStation>, status = row.status): OsceCircuit {
  const plan = planOf(row);
  return {
    id: row.id,
    title: row.title,
    status: status as OsceCircuit["status"],
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    totalSeconds: plan.totalSeconds,
    markingGraceSeconds: plan.timing.markingGraceSeconds,
    segments: plan.segments.map((s) => {
      const st = s.stationId ? stations.get(s.stationId) : undefined;
      return {
        kind: s.kind,
        stationSlug: st?.slug ?? null,
        stationTitle: st?.title ?? null,
        durationSeconds: s.durationSeconds,
        startOffsetSeconds: s.startOffsetSeconds,
      };
    }),
  };
}

async function loadOwned(id: string, ownerId: string): Promise<CircuitRow> {
  const [row] = await db
    .select()
    .from(osceCircuitsTable)
    .where(and(eq(osceCircuitsTable.id, id), eq(osceCircuitsTable.ownerId, ownerId)))
    .limit(1);
  if (!row) throw notFound("Circuit not found", "circuit_not_found");
  return row;
}

/** Applies the server clock: a running circuit whose last marking window has closed is completed. */
async function settle(row: CircuitRow, nowMs: number): Promise<CircuitRow> {
  if (row.status !== "running" || !row.startedAt) return row;
  const plan = planOf(row);
  const elapsed = elapsedSince(row.startedAt.getTime(), nowMs);
  if (elapsed < plan.totalSeconds + plan.timing.markingGraceSeconds) return row;
  const [updated] = await db
    .update(osceCircuitsTable)
    .set({ status: "completed", completedAt: new Date(row.startedAt.getTime() + plan.totalSeconds * 1000) })
    .where(and(eq(osceCircuitsTable.id, row.id), eq(osceCircuitsTable.status, "running")))
    .returning();
  return updated ?? { ...row, status: "completed" };
}

async function buildState(row: CircuitRow): Promise<OsceCircuitState> {
  const nowMs = Date.now();
  row = await settle(row, nowMs);
  const plan = planOf(row);
  const stations = await stationsByIds(stationIdsOf(plan));
  const attemptRows = await db.select().from(osceAttemptsTable).where(eq(osceAttemptsTable.circuitId, row.id));
  const attempts = attemptRows.flatMap((a) => {
    const st = stations.get(a.stationId);
    return st ? [toAttempt(a, st)] : [];
  });
  const state: OsceCircuitState = {
    circuit: serializeCircuit(row, stations),
    serverTime: new Date(nowMs),
    elapsedSeconds: 0,
    attempts,
  };
  if (row.startedAt) {
    const elapsed = elapsedSince(row.startedAt.getTime(), nowMs);
    state.elapsedSeconds = elapsed;
    const pos = locate(plan, elapsed);
    state.position = {
      finished: pos.finished,
      index: pos.index,
      kind: pos.segment.kind,
      stationSlug: pos.segment.stationId ? (stations.get(pos.segment.stationId)?.slug ?? null) : null,
      stationNumber: pos.stationNumber,
      segmentRemainingSeconds: pos.segmentRemainingSeconds,
      totalRemainingSeconds: pos.totalRemainingSeconds,
      markingOpenFor:
        row.status === "running"
          ? stationIdsOf(plan)
              .filter((id) => canSaveMarks(plan, id, elapsed))
              .flatMap((id) => (stations.get(id) ? [stations.get(id)!.slug] : []))
          : [],
    };
  }
  return state;
}

router.get("/circuits", async (req, res) => {
  const rows = await db
    .select()
    .from(osceCircuitsTable)
    .where(eq(osceCircuitsTable.ownerId, actorOf(req).id))
    .orderBy(desc(osceCircuitsTable.createdAt))
    .limit(30);
  const items: OsceCircuit[] = [];
  for (const row of rows) {
    const settled = await settle(row, Date.now());
    items.push(serializeCircuit(settled, await stationsByIds(stationIdsOf(planOf(settled)))));
  }
  res.json({ items });
});

router.post("/circuits", createLimit, async (req, res) => {
  const body = parse(CreateOsceCircuitBody, req.body);
  const stations: OsceStation[] = [];
  for (const slug of body.stationSlugs) stations.push(await findReadyStation(slug));
  let plan: CircuitPlan;
  try {
    plan = buildCircuitPlan(stations.map((s) => s.id), { restCount: body.restCount });
  } catch (err) {
    if (err instanceof CircuitPlanError) throw badRequest(err.message);
    throw err;
  }
  const [row] = await db
    .insert(osceCircuitsTable)
    .values({
      ownerId: actorOf(req).id,
      title: body.title?.trim() || `Circuit of ${stations.length} station${stations.length === 1 ? "" : "s"}`,
      plan: plan as unknown as Record<string, unknown>,
    })
    .returning();
  res.status(201).json(await buildState(row!));
});

router.get("/circuits/:id", async (req, res) => {
  const { id } = parse(GetOsceCircuitParams, req.params);
  res.json(await buildState(await loadOwned(id, actorOf(req).id)));
});

router.post("/circuits/:id/start", writeLimit, async (req, res) => {
  const { id } = parse(StartOsceCircuitParams, req.params);
  const row = await loadOwned(id, actorOf(req).id);
  // Guarded update: only a planned circuit can start, so a double click or second device cannot restart the clock.
  const [started] = await db
    .update(osceCircuitsTable)
    .set({ status: "running", startedAt: sql`now()` })
    .where(and(eq(osceCircuitsTable.id, row.id), eq(osceCircuitsTable.status, "planned")))
    .returning();
  if (!started) throw conflict("This circuit has already been started", "circuit_already_started");
  res.json(await buildState(started));
});

router.post("/circuits/:id/finish", writeLimit, async (req, res) => {
  const { id } = parse(FinishOsceCircuitParams, req.params);
  const row = await loadOwned(id, actorOf(req).id);
  if (row.status === "planned" || row.status === "running") {
    const [updated] = await db
      .update(osceCircuitsTable)
      .set({ status: "abandoned", completedAt: new Date() })
      .where(eq(osceCircuitsTable.id, row.id))
      .returning();
    res.json(await buildState(updated!));
    return;
  }
  res.json(await buildState(row));
});

router.put("/circuits/:id/stations/:slug/marks", writeLimit, async (req, res) => {
  const { id, slug } = parse(SaveOsceCircuitMarksParams, req.params);
  const body = parse(SaveOsceCircuitMarksBody, req.body);
  const ownerId = actorOf(req).id;
  const row = await settle(await loadOwned(id, ownerId), Date.now());
  if (row.status !== "running" || !row.startedAt) throw conflict("This circuit is not running", "circuit_not_running");
  const station = await findReadyStation(slug);
  const plan = planOf(row);
  if (!stationIdsOf(plan).includes(station.id)) throw notFound("That station is not part of this circuit", "station_not_in_circuit");
  // Strict, server-side timing: the browser's clock is irrelevant.
  if (!canSaveMarks(plan, station.id, elapsedSince(row.startedAt.getTime(), Date.now()))) {
    throw conflict("The marking window for this station is closed", "marking_window_closed");
  }
  const marks = checkMarks(await domainsFor(station.id), body);
  const values = {
    ownerId,
    stationId: station.id,
    circuitId: row.id,
    mode: "exam" as const,
    status: "saved" as const,
    marks: marks.marks,
    totalMarks: marks.total,
    maxMarks: marks.maxTotal,
    globalRating: toDatabaseRating(body.globalRating),
    notes: body.notes ?? null,
    savedAt: new Date(),
  };
  const [saved] = await db
    .insert(osceAttemptsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [osceAttemptsTable.circuitId, osceAttemptsTable.stationId],
      targetWhere: sql`${osceAttemptsTable.circuitId} is not null`,
      set: {
        marks: values.marks,
        totalMarks: values.totalMarks,
        maxMarks: values.maxMarks,
        globalRating: values.globalRating,
        notes: values.notes,
        savedAt: values.savedAt,
      },
    })
    .returning();
  res.json(toAttempt(saved!, station));
});

router.get("/circuits/:id/report", async (req, res) => {
  const { id } = parse(GetOsceCircuitReportParams, req.params);
  const row = await settle(await loadOwned(id, actorOf(req).id), Date.now());
  const plan = planOf(row);
  const stationIds = stationIdsOf(plan);
  const stations = await stationsByIds(stationIds);
  const attempts = await db.select().from(osceAttemptsTable).where(eq(osceAttemptsTable.circuitId, row.id));
  const domainRows = await db.select().from(osceMarkingDomainsTable).where(inArray(osceMarkingDomainsTable.stationId, stationIds));
  const domainsByStation = new Map<string, typeof domainRows>();
  for (const d of domainRows) {
    if (!stations.has(d.stationId)) continue;
    const list = domainsByStation.get(d.stationId) ?? [];
    list.push(d);
    domainsByStation.set(d.stationId, list);
  }

  const reportStations: OsceCircuitReport["stations"] = [];
  const forAggregation: { domains: { name: string; maxMarks: number; mark: number }[] }[] = [];
  let totalMarks = 0;
  let maxMarks = 0;
  for (const stationId of stationIds) {
    const st = stations.get(stationId);
    if (!st) continue;
    const domains = (domainsByStation.get(stationId) ?? []).sort((a, b) => a.position - b.position);
    const attempt = attempts.find((a) => a.stationId === stationId);
    const rows = domains.map((d) => ({ domain: d.domain, maxMarks: d.maxMarks, mark: attempt?.marks[d.id] ?? 0 }));
    const total = rows.reduce((s, r) => s + r.mark, 0);
    const max = rows.reduce((s, r) => s + r.maxMarks, 0);
    totalMarks += total;
    maxMarks += max; // unmarked stations still count towards the maximum
    forAggregation.push({ domains: rows.map((r) => ({ name: r.domain, maxMarks: r.maxMarks, mark: r.mark })) });
    reportStations.push({
      stationSlug: st.slug,
      stationTitle: st.title,
      marked: attempt !== undefined,
      totalMarks: total,
      maxMarks: max,
      percentage: percentage(total, max),
      globalRating: (attempt?.globalRating ?? null) as OsceCircuitReport["stations"][number]["globalRating"],
      domains: rows,
    });
  }
  const report: OsceCircuitReport = {
    circuit: serializeCircuit(row, stations),
    stations: reportStations,
    domains: aggregateByDomainName(forAggregation).map((d) => ({ ...d, percentage: percentage(d.awarded, d.max) })),
    totalMarks,
    maxMarks,
    percentage: percentage(totalMarks, maxMarks),
  };
  res.json(report);
});

export default router;
