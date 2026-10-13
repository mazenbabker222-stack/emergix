/**
 * Timezone-aware activity streaks, daily goal and exam countdown.
 *
 * A "day" is the learner's LOCAL calendar day (IANA timezone), so a review at 00:30 in
 * Khartoum counts for the new day even though it is still the previous day in UTC. A streak
 * stays alive until the end of the day after the last active one: not having studied *yet*
 * today does not break it.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

/** `YYYY-MM-DD` of `date` in `timeZone`. Throws RangeError for an invalid zone. */
export function localDateKey(date: Date, timeZone: string): string {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timeZone, f);
  }
  return f.format(date);
}

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcDay(key: string): number {
  if (!KEY_RE.test(key)) throw new RangeError(`Invalid date key: ${key}`);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function addDays(key: string, days: number): string {
  return new Date((toUtcDay(key) + days) * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function dayDiff(from: string, to: string): number {
  return toUtcDay(to) - toUtcDay(from);
}

/** 0 = Sunday … 6 = Saturday for a date key. */
export function weekdayOf(key: string): number {
  return new Date(toUtcDay(key) * 86_400_000).getUTCDay();
}

export interface StreakResult {
  current: number;
  longest: number;
  activeToday: boolean;
  lastActiveDate: string | null;
}

export function computeStreak(activity: readonly Date[], timeZone: string, now: Date): StreakResult {
  const today = localDateKey(now, timeZone);
  const days = new Set<string>();
  for (const a of activity) {
    if (Number.isNaN(a.getTime())) continue;
    const k = localDateKey(a, timeZone);
    if (k <= today) days.add(k); // activity "in the future" (clock skew) is ignored
  }

  const activeToday = days.has(today);
  let current = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    run = prev !== null && dayDiff(prev, k) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }

  return { current, longest, activeToday, lastActiveDate: sorted.at(-1) ?? null };
}

export function dailyGoalProgress(done: number, goal: number) {
  const safeGoal = Math.max(0, Math.floor(goal));
  const safeDone = Math.max(0, Math.floor(done));
  const fraction = safeGoal === 0 ? 1 : Math.min(1, safeDone / safeGoal);
  return { done: safeDone, goal: safeGoal, fraction, met: safeGoal === 0 || safeDone >= safeGoal };
}

/** Days left until the exam (0 on the day, negative afterwards). */
export function examCountdownDays(examDate: string, todayKey: string): number {
  return dayDiff(todayKey, examDate);
}
