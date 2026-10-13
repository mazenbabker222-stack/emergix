import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import {
  ApplyOsceRoomActionBody,
  ApplyOsceRoomActionParams,
  CreateOsceRoomAttemptBody,
  CreateOsceRoomAttemptParams,
  CreateOsceRoomBody,
  GetOsceRoomMarksParams,
  GetOsceRoomParams,
  JoinOsceRoomBody,
  JoinOsceRoomParams,
  SaveOsceRoomMarksBody,
  SaveOsceRoomMarksParams,
  StreamOsceRoomEventsParams,
} from "@workspace/api-zod";
import type { generatedTypes } from "@workspace/api-zod";
import {
  applyRoomAction,
  INITIAL_ROOM_CLOCK,
  RoomActionError,
  roomElapsedSeconds,
  roomPhase,
  settleRoomClock,
  type RoomClock,
} from "@workspace/osce-core";
import { db, osceAttemptsTable, osceRoomsTable, osceStationsTable, type OsceRoom, type OsceStation } from "@workspace/db";
import { conflict, forbidden, notFound, parse } from "../../lib/http-error";
import { publishRoom, subscribeRoom } from "../../lib/osce/room-bus";
import { toAttempt, toDatabaseRating } from "../../lib/osce/serializers";
import { domainsFor, findReadyStation } from "../../lib/osce/stations";
import { actorOf } from "../../lib/osce/actor";
import { rateLimit } from "../../middlewares/rate-limit";
import { checkMarks } from "./attempts";

const router: IRouter = Router();
type OsceRoomState = generatedTypes.OsceRoomState;
const writeLimit = rateLimit({ windowMs: 60_000, max: 240 });
const createLimit = rateLimit({ windowMs: 60_000, max: 10 });

const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const HEARTBEAT_MS = 25_000;
// Unambiguous characters (no 0/O/1/l/I). 10 characters = about 50 bits, so codes cannot be guessed.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function newCode(): string {
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

type Role = "candidate" | "examiner";

const clockOf = (room: OsceRoom) => room.clock as unknown as RoomClock;
const roleOf = (room: OsceRoom, actorId: string): Role | null =>
  room.candidateId === actorId ? "candidate" : room.examinerId === actorId ? "examiner" : null;

async function loadRoom(code: string): Promise<{ room: OsceRoom; station: OsceStation }> {
  const [row] = await db
    .select({ room: osceRoomsTable, station: osceStationsTable })
    .from(osceRoomsTable)
    .innerJoin(osceStationsTable, eq(osceRoomsTable.stationId, osceStationsTable.id))
    .where(eq(osceRoomsTable.code, code))
    .limit(1);
  if (!row || row.room.expiresAt.getTime() < Date.now()) throw notFound("Room not found or expired", "room_not_found");
  return row;
}

function stateFor(room: OsceRoom, station: OsceStation, actorId: string): OsceRoomState {
  const nowMs = Date.now();
  const timing = {
    readingSeconds: station.readingSeconds,
    historySeconds: station.historySeconds,
    examinerSeconds: station.examinerSeconds,
  };
  const clock = settleRoomClock(clockOf(room), timing, nowMs);
  const phase = roomPhase(clock, timing, nowMs);
  return {
    code: room.code,
    stationSlug: station.slug,
    stationTitle: station.title,
    timing,
    yourRole: roleOf(room, actorId),
    candidateJoined: room.candidateId !== null,
    examinerJoined: room.examinerId !== null,
    clockStatus: clock.status,
    phase: phase.phase,
    elapsedSeconds: roomElapsedSeconds(clock, nowMs),
    phaseRemainingSeconds: phase.remaining,
    totalRemainingSeconds: phase.totalRemaining,
    serverTime: new Date(nowMs),
    expiresAt: room.expiresAt,
  };
}

router.post("/rooms", createLimit, async (req, res) => {
  const body = parse(CreateOsceRoomBody, req.body);
  const station = await findReadyStation(body.stationSlug);
  const actorId = actorOf(req).id;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [room] = await db
        .insert(osceRoomsTable)
        .values({
          code: newCode(),
          stationId: station.id,
          hostId: actorId,
          candidateId: body.role === "candidate" ? actorId : null,
          examinerId: body.role === "examiner" ? actorId : null,
          clock: INITIAL_ROOM_CLOCK as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + ROOM_TTL_MS),
        })
        .returning();
      res.status(201).json(stateFor(room!, station, actorId));
      return;
    } catch (err) {
      // 23505 = unique violation on the code: extremely unlikely, try another code.
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }
  throw conflict("Could not create a room, please try again", "room_code_collision");
});

router.get("/rooms/:code", async (req, res) => {
  const { code } = parse(GetOsceRoomParams, req.params);
  const { room, station } = await loadRoom(code);
  res.json(stateFor(room, station, actorOf(req).id));
});

router.post("/rooms/:code/join", writeLimit, async (req, res) => {
  const { code } = parse(JoinOsceRoomParams, req.params);
  const body = parse(JoinOsceRoomBody, req.body ?? {});
  const actorId = actorOf(req).id;
  const { room, station } = await loadRoom(code);
  if (roleOf(room, actorId)) {
    res.json(stateFor(room, station, actorId));
    return;
  }

  const free: Role[] = [];
  if (!room.candidateId) free.push("candidate");
  if (!room.examinerId) free.push("examiner");
  const role = body.role && free.includes(body.role) ? body.role : free[0];
  if (!role) throw conflict("This room already has a candidate and an examiner", "room_full");

  // Guarded update so two people opening the link at the same moment cannot both take one seat.
  const column = role === "candidate" ? osceRoomsTable.candidateId : osceRoomsTable.examinerId;
  const [updated] = await db
    .update(osceRoomsTable)
    .set(role === "candidate" ? { candidateId: actorId } : { examinerId: actorId })
    .where(and(eq(osceRoomsTable.id, room.id), isNull(column)))
    .returning();
  if (!updated) throw conflict("That role has just been taken", "room_role_taken");
  publishRoom(code);
  res.json(stateFor(updated, station, actorId));
});

router.post("/rooms/:code/actions", writeLimit, async (req, res) => {
  const { code } = parse(ApplyOsceRoomActionParams, req.params);
  const { action } = parse(ApplyOsceRoomActionBody, req.body);
  const actorId = actorOf(req).id;
  const { station } = await loadRoom(code);
  const updated = await db.transaction(async (tx) => {
    // Lock the row so simultaneous presses from both screens are applied one after the other.
    const [room] = await tx.select().from(osceRoomsTable).where(eq(osceRoomsTable.code, code)).for("update");
    if (!room) throw notFound("Room not found or expired", "room_not_found");
    if (!roleOf(room, actorId)) throw forbidden("Only the candidate and the examiner can control the clock", "not_a_participant");
    let next: RoomClock;
    try {
      next = applyRoomAction(
        clockOf(room),
        action,
        { readingSeconds: station.readingSeconds, historySeconds: station.historySeconds, examinerSeconds: station.examinerSeconds },
        Date.now(),
      );
    } catch (err) {
      if (err instanceof RoomActionError) throw conflict(err.message, "invalid_clock_action");
      throw err;
    }
    const [saved] = await tx
      .update(osceRoomsTable)
      .set({ clock: next as unknown as Record<string, unknown> })
      .where(eq(osceRoomsTable.id, room.id))
      .returning();
    return saved!;
  });
  publishRoom(code);
  res.json(stateFor(updated, station, actorId));
});

router.get("/rooms/:code/events", async (req: Request, res) => {
  const { code } = parse(StreamOsceRoomEventsParams, req.params);
  const actorId = actorOf(req).id;
  await loadRoom(code); // 404 before opening the stream

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  let closed = false;
  const send = async () => {
    if (closed) return;
    try {
      const { room, station } = await loadRoom(code);
      res.write(`event: state\ndata: ${JSON.stringify(stateFor(room, station, actorId))}\n\n`);
    } catch {
      res.write(`event: gone\ndata: {}\n\n`);
    }
  };
  await send();
  const unsubscribe = subscribeRoom(code, () => void send());
  const heartbeat = setInterval(() => res.write(`: ping\n\n`), HEARTBEAT_MS);
  req.on("close", () => {
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
  });
});

/** The examiner's marking sheet for a room. Candidates never see it. */
async function examinerContext(req: Request, code: string) {
  const { room, station } = await loadRoom(code);
  const actorId = actorOf(req).id;
  if (room.examinerId !== actorId) throw forbidden("Only the examiner can use the marking sheet", "examiner_only");
  return { room, station, actorId };
}

router.get("/rooms/:code/marks", async (req, res) => {
  const { code } = parse(GetOsceRoomMarksParams, req.params);
  const { room, station, actorId } = await examinerContext(req, code);
  const [row] = await db
    .select()
    .from(osceAttemptsTable)
    .where(and(eq(osceAttemptsTable.ownerId, actorId), eq(osceAttemptsTable.roomId, room.id), eq(osceAttemptsTable.status, "draft")))
    .limit(1);
  res.json(row ? { attempt: toAttempt(row, station) } : {});
});

router.put("/rooms/:code/marks", writeLimit, async (req, res) => {
  const { code } = parse(SaveOsceRoomMarksParams, req.params);
  const body = parse(SaveOsceRoomMarksBody, req.body);
  const { room, station, actorId } = await examinerContext(req, code);
  const marks = checkMarks(await domainsFor(station.id), body);
  const values = {
    ownerId: actorId,
    stationId: station.id,
    roomId: room.id,
    mode: "exam" as const,
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
      target: [osceAttemptsTable.ownerId, osceAttemptsTable.roomId],
      targetWhere: and(eq(osceAttemptsTable.status, "draft"), isNotNull(osceAttemptsTable.roomId)),
      set: { marks: values.marks, totalMarks: values.totalMarks, maxMarks: values.maxMarks, globalRating: values.globalRating, notes: values.notes },
    })
    .returning();
  res.json(toAttempt(row!, station));
});

router.post("/rooms/:code/marks", writeLimit, async (req, res) => {
  const { code } = parse(CreateOsceRoomAttemptParams, req.params);
  const body = parse(CreateOsceRoomAttemptBody, req.body);
  const { room, station, actorId } = await examinerContext(req, code);
  const marks = checkMarks(await domainsFor(station.id), body);
  const row = await db.transaction(async (tx) => {
    await tx
      .delete(osceAttemptsTable)
      .where(and(eq(osceAttemptsTable.ownerId, actorId), eq(osceAttemptsTable.roomId, room.id), eq(osceAttemptsTable.status, "draft")));
    const [saved] = await tx
      .insert(osceAttemptsTable)
      .values({
        ownerId: actorId,
        stationId: station.id,
        roomId: room.id,
        mode: "exam" as const,
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

export default router;
