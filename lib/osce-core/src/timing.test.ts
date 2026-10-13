import { describe, expect, it } from 'vitest';
import { DEFAULT_STATION_TIMING, formatClock, phaseAt, totalSeconds } from './timing';

const t = DEFAULT_STATION_TIMING; // 60 + 480 + 120

describe('phaseAt', () => {
  it('starts in the reading phase', () => {
    const s = phaseAt(t, 0);
    expect(s.phase).toBe('reading');
    expect(s.remaining).toBe(60);
    expect(s.totalRemaining).toBe(660);
  });

  it('moves to history after reading and examiner after history', () => {
    expect(phaseAt(t, 60).phase).toBe('history');
    expect(phaseAt(t, 59.5).phase).toBe('reading');
    expect(phaseAt(t, 539.9).phase).toBe('history');
    expect(phaseAt(t, 540).phase).toBe('examiner');
    expect(phaseAt(t, 540).remaining).toBe(120);
  });

  it('finishes exactly at the total and never goes negative', () => {
    expect(totalSeconds(t)).toBe(660);
    const done = phaseAt(t, 660);
    expect(done.phase).toBe('finished');
    expect(done.remaining).toBe(0);
    expect(phaseAt(t, 9999).phase).toBe('finished');
    expect(phaseAt(t, -5).phase).toBe('reading');
  });

  it('warns during the last minute of a phase', () => {
    expect(phaseAt(t, 60 + 419).warning).toBe(false);
    expect(phaseAt(t, 60 + 421).warning).toBe(true);
    expect(phaseAt(t, 0).warning).toBe(true); // reading is exactly 60 s
  });

  it('skips phases with zero length', () => {
    const noReading = { readingSeconds: 0, historySeconds: 480, examinerSeconds: 120 };
    expect(phaseAt(noReading, 0).phase).toBe('history');
  });

  it('formats clocks', () => {
    expect(formatClock(480)).toBe('08:00');
    expect(formatClock(59.2)).toBe('01:00');
    expect(formatClock(-3)).toBe('00:00');
  });
});
