import { describe, expect, it } from 'vitest';
import { addDays, computeStreak, dailyGoalProgress, dayDiff, examCountdownDays, localDateKey, weekdayOf } from './streak';

const d = (iso: string) => new Date(iso);

describe('date keys', () => {
  it('uses the learner local day, not UTC', () => {
    expect(localDateKey(d('2026-10-11T22:30:00Z'), 'Africa/Khartoum')).toBe('2026-10-12'); // 00:30 local
    expect(localDateKey(d('2026-10-11T22:30:00Z'), 'UTC')).toBe('2026-10-11');
    expect(localDateKey(d('2026-10-12T03:30:00Z'), 'America/New_York')).toBe('2026-10-11');
  });
  it('does month/year arithmetic and weekdays', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(dayDiff('2026-03-01', '2026-03-08')).toBe(7);
    expect(weekdayOf('2026-10-12')).toBe(1); // Monday
    expect(() => addDays('2026-1-1', 1)).toThrow(RangeError);
  });
  it('rejects an invalid timezone', () => {
    expect(() => localDateKey(new Date(), 'Not/AZone')).toThrow(RangeError);
  });
});

describe('computeStreak', () => {
  const tz = 'Africa/Khartoum';
  const now = d('2026-10-12T10:00:00Z'); // 12:00 local, Monday

  it('counts consecutive local days ending today', () => {
    const r = computeStreak([d('2026-10-12T06:00:00Z'), d('2026-10-11T08:00:00Z'), d('2026-10-10T08:00:00Z')], tz, now);
    expect(r).toMatchObject({ current: 3, longest: 3, activeToday: true, lastActiveDate: '2026-10-12' });
  });
  it('keeps the streak alive when today has no activity yet', () => {
    const r = computeStreak([d('2026-10-11T08:00:00Z'), d('2026-10-10T08:00:00Z')], tz, now);
    expect(r).toMatchObject({ current: 2, activeToday: false });
  });
  it('breaks after a missed day but remembers the longest run', () => {
    const r = computeStreak(
      [d('2026-10-05T08:00:00Z'), d('2026-10-06T08:00:00Z'), d('2026-10-07T08:00:00Z'), d('2026-10-10T08:00:00Z')],
      tz,
      now,
    );
    expect(r.current).toBe(0);
    expect(r.longest).toBe(3);
  });
  it('treats two sessions on one local day as one, and a post-midnight session as the next day', () => {
    const r = computeStreak(
      [d('2026-10-11T08:00:00Z'), d('2026-10-11T09:00:00Z'), d('2026-10-11T22:30:00Z') /* 00:30 on 12th local */],
      tz,
      now,
    );
    expect(r.current).toBe(2);
  });
  it('is stable across a DST change', () => {
    const ny = 'America/New_York';
    const r = computeStreak(
      [d('2026-03-08T04:30:00Z') /* Mar 7 23:30 EST */, d('2026-03-08T16:00:00Z') /* Mar 8 noon EDT */, d('2026-03-09T04:30:00Z') /* Mar 9 00:30 EDT */],
      ny,
      d('2026-03-09T15:00:00Z'),
    );
    expect(r.current).toBe(3);
  });
  it('ignores future and invalid dates; handles empty input', () => {
    expect(computeStreak([d('2026-10-20T00:00:00Z'), new Date('x')], tz, now).current).toBe(0);
    expect(computeStreak([], tz, now)).toEqual({ current: 0, longest: 0, activeToday: false, lastActiveDate: null });
  });
});

describe('goal and countdown', () => {
  it('computes goal progress', () => {
    expect(dailyGoalProgress(5, 20)).toEqual({ done: 5, goal: 20, fraction: 0.25, met: false });
    expect(dailyGoalProgress(25, 20)).toMatchObject({ fraction: 1, met: true });
    expect(dailyGoalProgress(0, 0).met).toBe(true);
  });
  it('counts days to the exam', () => {
    expect(examCountdownDays('2026-12-14', '2026-10-12')).toBe(63);
    expect(examCountdownDays('2026-10-12', '2026-10-12')).toBe(0);
    expect(examCountdownDays('2026-10-10', '2026-10-12')).toBe(-2);
  });
});
