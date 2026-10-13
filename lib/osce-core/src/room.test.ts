import { describe, expect, it } from 'vitest';
import { applyRoomAction, INITIAL_ROOM_CLOCK, RoomActionError, roomElapsedSeconds, roomPhase, settleRoomClock } from './room';
import { DEFAULT_STATION_TIMING as t, totalSeconds } from './timing';

const T0 = 1_000_000;

describe('room clock', () => {
  it('starts from the lobby and counts server time', () => {
    const c = applyRoomAction(INITIAL_ROOM_CLOCK, 'start', t, T0);
    expect(c.status).toBe('running');
    expect(roomElapsedSeconds(c, T0 + 30_000)).toBe(30);
    expect(roomPhase(c, t, T0 + 30_000).phase).toBe('reading');
    expect(roomPhase(c, t, T0 + 61_000).phase).toBe('history');
  });

  it('pauses and resumes without losing time', () => {
    const run = applyRoomAction(INITIAL_ROOM_CLOCK, 'start', t, T0);
    const paused = applyRoomAction(run, 'pause', t, T0 + 100_000);
    expect(paused.status).toBe('paused');
    expect(roomElapsedSeconds(paused, T0 + 999_999)).toBe(100);
    const resumed = applyRoomAction(paused, 'resume', t, T0 + 200_000);
    expect(roomElapsedSeconds(resumed, T0 + 230_000)).toBe(130);
  });

  it('finishes automatically when the time is used', () => {
    const run = applyRoomAction(INITIAL_ROOM_CLOCK, 'start', t, T0);
    const done = settleRoomClock(run, t, T0 + totalSeconds(t) * 1000 + 1);
    expect(done.status).toBe('finished');
  });

  it('rejects invalid transitions', () => {
    expect(() => applyRoomAction(INITIAL_ROOM_CLOCK, 'pause', t, T0)).toThrow(RoomActionError);
    expect(() => applyRoomAction(INITIAL_ROOM_CLOCK, 'resume', t, T0)).toThrow(RoomActionError);
    const run = applyRoomAction(INITIAL_ROOM_CLOCK, 'start', t, T0);
    expect(() => applyRoomAction(run, 'start', t, T0 + 1)).toThrow(RoomActionError);
  });

  it('skips to the next phase and can reset', () => {
    const run = applyRoomAction(INITIAL_ROOM_CLOCK, 'start', t, T0);
    const skipped = applyRoomAction(run, 'skip', t, T0 + 10_000);
    expect(roomPhase(skipped, t, T0 + 10_000).phase).toBe('history');
    const toExaminer = applyRoomAction(skipped, 'skip', t, T0 + 20_000);
    expect(roomPhase(toExaminer, t, T0 + 20_000).phase).toBe('examiner');
    const finished = applyRoomAction(toExaminer, 'skip', t, T0 + 30_000);
    expect(finished.status).toBe('finished');
    expect(applyRoomAction(finished, 'reset', t, T0 + 40_000)).toEqual(INITIAL_ROOM_CLOCK);
  });
});
