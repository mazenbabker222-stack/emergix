/**
 * Circuit mode: a chain of stations with a reading minute, fixed-length stations and rest
 * stations. The server stores the plan and the start time; the current position is always
 * derived from the server clock, so refreshing or switching device cannot change the timing.
 */

export const MAX_CIRCUIT_STATIONS = 16;
export const DEFAULT_REST_STATIONS = 2;

export interface CircuitTiming {
  readingSeconds: number;
  stationSeconds: number;
  restSeconds: number;
  /** Extra time after a station ends during which its marks can still be saved. */
  markingGraceSeconds: number;
}

export const DEFAULT_CIRCUIT_TIMING: CircuitTiming = {
  readingSeconds: 60,
  stationSeconds: 480,
  restSeconds: 480,
  markingGraceSeconds: 60,
};

export type SegmentKind = 'reading' | 'station' | 'rest';

export interface CircuitSegment {
  kind: SegmentKind;
  /** Present for reading and station segments. */
  stationId?: string;
  durationSeconds: number;
  /** Seconds from the start of the circuit. */
  startOffsetSeconds: number;
}

export interface CircuitPlan {
  timing: CircuitTiming;
  segments: CircuitSegment[];
  totalSeconds: number;
}

export class CircuitPlanError extends Error {}

/** Positions (0-based index of the station AFTER which a rest station sits) for `restCount` rests. */
export function restPositions(stationCount: number, restCount: number): number[] {
  if (restCount <= 0 || stationCount < 2) return [];
  const positions = new Set<number>();
  for (let i = 1; i <= restCount; i++) {
    const after = Math.min(stationCount - 2, Math.max(0, Math.floor((stationCount * i) / (restCount + 1)) - 1));
    positions.add(after);
  }
  return [...positions].sort((a, b) => a - b);
}

export function buildCircuitPlan(
  stationIds: readonly string[],
  options: { restCount?: number; timing?: Partial<CircuitTiming> } = {},
): CircuitPlan {
  if (stationIds.length === 0) throw new CircuitPlanError('A circuit needs at least one station');
  if (stationIds.length > MAX_CIRCUIT_STATIONS) {
    throw new CircuitPlanError(`A circuit can have at most ${MAX_CIRCUIT_STATIONS} stations`);
  }
  if (new Set(stationIds).size !== stationIds.length) throw new CircuitPlanError('Stations in a circuit must be unique');
  const timing: CircuitTiming = { ...DEFAULT_CIRCUIT_TIMING, ...options.timing };
  const rests = new Set(restPositions(stationIds.length, options.restCount ?? DEFAULT_REST_STATIONS));
  const segments: CircuitSegment[] = [];
  let offset = 0;
  const push = (kind: SegmentKind, durationSeconds: number, stationId?: string) => {
    segments.push({ kind, durationSeconds, startOffsetSeconds: offset, ...(stationId ? { stationId } : {}) });
    offset += durationSeconds;
  };
  stationIds.forEach((id, index) => {
    push('reading', timing.readingSeconds, id);
    push('station', timing.stationSeconds, id);
    if (rests.has(index)) push('rest', timing.restSeconds);
  });
  return { timing, segments, totalSeconds: offset };
}

export interface CircuitPosition {
  finished: boolean;
  /** Index into plan.segments (last index when finished). */
  index: number;
  segment: CircuitSegment;
  segmentRemainingSeconds: number;
  totalRemainingSeconds: number;
  /** Number of the station being run (1-based) or null during rest. */
  stationNumber: number | null;
}

/** Minimal segment shape, so the web app (which has slugs, not ids) can reuse the same maths. */
export interface TimedSegment {
  durationSeconds: number;
  startOffsetSeconds: number;
}

export interface SegmentLocation {
  finished: boolean;
  index: number;
  segmentRemainingSeconds: number;
  totalRemainingSeconds: number;
}

export function locateInSegments(segments: readonly TimedSegment[], totalSeconds: number, elapsedSeconds: number): SegmentLocation {
  const elapsed = Math.max(0, elapsedSeconds);
  const last = segments.length - 1;
  for (let i = 0; i <= last; i++) {
    const seg = segments[i]!;
    const end = seg.startOffsetSeconds + seg.durationSeconds;
    if (elapsed < end) {
      return { finished: false, index: i, segmentRemainingSeconds: Math.ceil(end - elapsed), totalRemainingSeconds: Math.ceil(totalSeconds - elapsed) };
    }
  }
  return { finished: true, index: last, segmentRemainingSeconds: 0, totalRemainingSeconds: 0 };
}

export function locate(plan: CircuitPlan, elapsedSeconds: number): CircuitPosition {
  const elapsed = Math.max(0, elapsedSeconds);
  const last = plan.segments.length - 1;
  const stationOrder = stationIdsOf(plan);
  for (let i = 0; i <= last; i++) {
    const seg = plan.segments[i]!;
    const end = seg.startOffsetSeconds + seg.durationSeconds;
    if (elapsed < end) {
      return {
        finished: false,
        index: i,
        segment: seg,
        segmentRemainingSeconds: Math.ceil(end - elapsed),
        totalRemainingSeconds: Math.ceil(plan.totalSeconds - elapsed),
        stationNumber: seg.stationId ? stationOrder.indexOf(seg.stationId) + 1 : null,
      };
    }
  }
  return {
    finished: true,
    index: last,
    segment: plan.segments[last]!,
    segmentRemainingSeconds: 0,
    totalRemainingSeconds: 0,
    stationNumber: null,
  };
}

export function stationIdsOf(plan: CircuitPlan): string[] {
  const ids: string[] = [];
  for (const seg of plan.segments) {
    if (seg.kind === 'station' && seg.stationId) ids.push(seg.stationId);
  }
  return ids;
}

/**
 * Marks for a station may be saved from the start of its reading minute until the end of the
 * station plus the grace period. Anything else is rejected by the server.
 */
export function markingWindow(plan: CircuitPlan, stationId: string): { opensAt: number; closesAt: number } | null {
  const reading = plan.segments.find((s) => s.kind === 'reading' && s.stationId === stationId);
  const station = plan.segments.find((s) => s.kind === 'station' && s.stationId === stationId);
  if (!reading || !station) return null;
  return {
    opensAt: reading.startOffsetSeconds,
    closesAt: station.startOffsetSeconds + station.durationSeconds + plan.timing.markingGraceSeconds,
  };
}

export function canSaveMarks(plan: CircuitPlan, stationId: string, elapsedSeconds: number): boolean {
  const window = markingWindow(plan, stationId);
  if (!window) return false;
  return elapsedSeconds >= window.opensAt && elapsedSeconds <= window.closesAt;
}

/** Elapsed seconds from an ISO/epoch start time and the server's current time. */
export function elapsedSince(startedAtMs: number, nowMs: number): number {
  return Math.max(0, (nowMs - startedAtMs) / 1000);
}
