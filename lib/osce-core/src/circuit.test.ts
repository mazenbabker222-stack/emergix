import { describe, expect, it } from 'vitest';
import {
  buildCircuitPlan,
  canSaveMarks,
  CircuitPlanError,
  locate,
  locateInSegments,
  markingWindow,
  MAX_CIRCUIT_STATIONS,
  restPositions,
  stationIdsOf,
} from './circuit';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${i + 1}`);

describe('circuit plan', () => {
  it('chains reading + station per station with two rest stations', () => {
    const plan = buildCircuitPlan(ids(6));
    expect(plan.segments.filter((s) => s.kind === 'rest')).toHaveLength(2);
    expect(plan.segments.filter((s) => s.kind === 'reading')).toHaveLength(6);
    expect(plan.segments.filter((s) => s.kind === 'station')).toHaveLength(6);
    // 6 * (60 + 480) + 2 * 480
    expect(plan.totalSeconds).toBe(6 * 540 + 2 * 480);
    expect(stationIdsOf(plan)).toEqual(ids(6));
  });

  it('has contiguous offsets', () => {
    const plan = buildCircuitPlan(ids(5));
    let offset = 0;
    for (const seg of plan.segments) {
      expect(seg.startOffsetSeconds).toBe(offset);
      offset += seg.durationSeconds;
    }
    expect(offset).toBe(plan.totalSeconds);
  });

  it('supports the 16-station maximum and rejects more', () => {
    expect(buildCircuitPlan(ids(MAX_CIRCUIT_STATIONS)).segments.filter((s) => s.kind === 'station')).toHaveLength(16);
    expect(() => buildCircuitPlan(ids(17))).toThrow(CircuitPlanError);
  });

  it('rejects empty and duplicate station lists', () => {
    expect(() => buildCircuitPlan([])).toThrow(CircuitPlanError);
    expect(() => buildCircuitPlan(['a', 'a'])).toThrow(CircuitPlanError);
  });

  it('never puts a rest station before the first or after the last station', () => {
    for (let n = 1; n <= 16; n++) {
      const plan = buildCircuitPlan(ids(n));
      expect(plan.segments[0]!.kind).toBe('reading');
      expect(plan.segments[plan.segments.length - 1]!.kind).toBe('station');
    }
    expect(restPositions(1, 2)).toEqual([]);
    expect(restPositions(16, 2)).toHaveLength(2);
  });

  it('places at most the requested number of rests', () => {
    expect(buildCircuitPlan(ids(8), { restCount: 0 }).segments.some((s) => s.kind === 'rest')).toBe(false);
  });
});

describe('locate and marking window', () => {
  const plan = buildCircuitPlan(ids(3), { restCount: 0 }); // reading 60, station 480 each

  it('locates the current segment from elapsed time', () => {
    expect(locate(plan, 0).segment.kind).toBe('reading');
    expect(locate(plan, 0).segmentRemainingSeconds).toBe(60);
    expect(locate(plan, 60).segment.kind).toBe('station');
    expect(locate(plan, 539).stationNumber).toBe(1);
    expect(locate(plan, 540).segment.stationId).toBe('s2');
    expect(locate(plan, 540).stationNumber).toBe(2);
  });

  it('reports finished after the end', () => {
    expect(locate(plan, plan.totalSeconds).finished).toBe(true);
    expect(locate(plan, plan.totalSeconds - 1).finished).toBe(false);
  });

  it('accepts marks only inside the window plus grace', () => {
    const w = markingWindow(plan, 's2')!;
    expect(w.opensAt).toBe(540);
    expect(w.closesAt).toBe(540 + 540 + 60);
    expect(canSaveMarks(plan, 's2', 539)).toBe(false); // station 1 still running
    expect(canSaveMarks(plan, 's2', 541)).toBe(true);
    expect(canSaveMarks(plan, 's2', 1140)).toBe(true); // end + grace
    expect(canSaveMarks(plan, 's2', 1141)).toBe(false);
    expect(canSaveMarks(plan, 'unknown', 600)).toBe(false);
  });
});

describe('locateInSegments', () => {
  it('matches locate() for the same plan', () => {
    const plan = buildCircuitPlan(['a', 'b', 'c']);
    for (const t of [0, 59, 60, 539, 540, 1500, plan.totalSeconds - 1, plan.totalSeconds, plan.totalSeconds + 50]) {
      const a = locate(plan, t);
      const b = locateInSegments(plan.segments, plan.totalSeconds, t);
      expect(b.index).toBe(a.index);
      expect(b.finished).toBe(a.finished);
      expect(b.segmentRemainingSeconds).toBe(a.segmentRemainingSeconds);
    }
  });
});
