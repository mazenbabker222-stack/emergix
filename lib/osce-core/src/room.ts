/**
 * Partner room timer: one shared clock for a candidate and an examiner. The state is stored
 * on the server and every client derives the remaining time from `serverNowMs - startedAtMs`,
 * so both screens stay in step without per-second messages.
 *
 * The clock is "running" when `startedAtMs` is set. Pausing stores the elapsed time so far.
 */

import { phaseAt, totalSeconds, type PhaseState, type StationTiming } from './timing';

export type RoomStatus = 'lobby' | 'running' | 'paused' | 'finished';

export interface RoomClock {
  status: RoomStatus;
  /** Epoch ms when the clock last (re)started, or null if not running. */
  startedAtMs: number | null;
  /** Seconds already elapsed before `startedAtMs` (accumulates across pauses). */
  elapsedBeforeSeconds: number;
}

export const INITIAL_ROOM_CLOCK: RoomClock = { status: 'lobby', startedAtMs: null, elapsedBeforeSeconds: 0 };

export type RoomAction = 'start' | 'pause' | 'resume' | 'reset' | 'skip';

export function roomElapsedSeconds(clock: RoomClock, nowMs: number): number {
  if (clock.status === 'running' && clock.startedAtMs !== null) {
    return clock.elapsedBeforeSeconds + Math.max(0, (nowMs - clock.startedAtMs) / 1000);
  }
  return clock.elapsedBeforeSeconds;
}

export function roomPhase(clock: RoomClock, timing: StationTiming, nowMs: number): PhaseState {
  return phaseAt(timing, roomElapsedSeconds(clock, nowMs));
}

/** Applies time passing: a running clock that has used all the time becomes finished. */
export function settleRoomClock(clock: RoomClock, timing: StationTiming, nowMs: number): RoomClock {
  if (clock.status !== 'running') return clock;
  const elapsed = roomElapsedSeconds(clock, nowMs);
  if (elapsed >= totalSeconds(timing)) {
    return { status: 'finished', startedAtMs: null, elapsedBeforeSeconds: totalSeconds(timing) };
  }
  return clock;
}

export class RoomActionError extends Error {}

export function applyRoomAction(clock: RoomClock, action: RoomAction, timing: StationTiming, nowMs: number): RoomClock {
  const current = settleRoomClock(clock, timing, nowMs);
  switch (action) {
    case 'start':
      if (current.status !== 'lobby') throw new RoomActionError('The station has already started');
      return { status: 'running', startedAtMs: nowMs, elapsedBeforeSeconds: 0 };
    case 'pause':
      if (current.status !== 'running') throw new RoomActionError('The clock is not running');
      return { status: 'paused', startedAtMs: null, elapsedBeforeSeconds: roomElapsedSeconds(current, nowMs) };
    case 'resume':
      if (current.status !== 'paused') throw new RoomActionError('The clock is not paused');
      return { status: 'running', startedAtMs: nowMs, elapsedBeforeSeconds: current.elapsedBeforeSeconds };
    case 'skip': {
      // Jump to the start of the next phase.
      if (current.status === 'lobby' || current.status === 'finished') throw new RoomActionError('Nothing to skip');
      const elapsed = roomElapsedSeconds(current, nowMs);
      const bounds = [
        timing.readingSeconds,
        timing.readingSeconds + timing.historySeconds,
        totalSeconds(timing),
      ];
      const next = bounds.find((b) => b > elapsed + 0.001) ?? totalSeconds(timing);
      if (next >= totalSeconds(timing)) return { status: 'finished', startedAtMs: null, elapsedBeforeSeconds: totalSeconds(timing) };
      return current.status === 'running'
        ? { status: 'running', startedAtMs: nowMs, elapsedBeforeSeconds: next }
        : { status: 'paused', startedAtMs: null, elapsedBeforeSeconds: next };
    }
    case 'reset':
      return { ...INITIAL_ROOM_CLOCK };
    default: {
      const never: never = action;
      throw new RoomActionError(`Unknown action ${String(never)}`);
    }
  }
}
