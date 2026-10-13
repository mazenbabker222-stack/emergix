import { describe, expect, it } from 'vitest';
import {
  GRADE_QUALITY,
  INITIAL_EASE_FACTOR,
  MIN_EASE_FACTOR,
  MS_PER_DAY,
  buildReviewQueue,
  newCardSchedule,
  nextEaseFactor,
  reviewCard,
  reviewCardWithGrade,
  type CardSchedule,
} from './sm2';

const T0 = new Date('2026-01-01T09:00:00.000Z');
const days = (n: number) => new Date(T0.getTime() + n * MS_PER_DAY);

function run(qualities: number[]) {
  let card = newCardSchedule(T0);
  const out: CardSchedule[] = [];
  let now = T0;
  for (const q of qualities) {
    card = reviewCard(card, q, now);
    out.push(card);
    now = card.dueAt;
  }
  return out;
}

describe('SM-2 intervals (reference algorithm)', () => {
  it('quality 4 every time: 1, 6, 15, 38, 95 days; EF stays 2.5', () => {
    const steps = run([4, 4, 4, 4, 4]);
    expect(steps.map((s) => s.intervalDays)).toEqual([1, 6, 15, 38, 95]);
    expect(steps.every((s) => s.easeFactor === 2.5)).toBe(true);
  });

  it('quality 5 raises EF by 0.1 per review; interval uses the EF before the review', () => {
    const steps = run([5, 5, 5, 5]);
    expect(steps.map((s) => s.easeFactor)).toEqual([2.6, 2.7, 2.8, 2.9]);
    expect(steps.map((s) => s.intervalDays)).toEqual([1, 6, 16, 45]); // round(6*2.7)=16, round(16*2.8)=45
  });

  it('quality 3 lowers EF by 0.14', () => {
    expect(nextEaseFactor(2.5, 3)).toBe(2.36);
    expect(nextEaseFactor(2.5, 4)).toBe(2.5);
    expect(nextEaseFactor(2.5, 5)).toBe(2.6);
  });

  it('EF never drops below 1.3', () => {
    let ef = INITIAL_EASE_FACTOR;
    for (let i = 0; i < 50; i++) ef = nextEaseFactor(ef, 3);
    expect(ef).toBe(MIN_EASE_FACTOR);
  });

  it('failure (q<3) resets repetitions and interval to 1 day, keeps EF, counts a lapse', () => {
    const [a, b, c] = run([4, 4, 4]);
    expect(c!.repetitions).toBe(3);
    const failed = reviewCard(c!, 2, c!.dueAt);
    expect(failed.repetitions).toBe(0);
    expect(failed.intervalDays).toBe(1);
    expect(failed.easeFactor).toBe(c!.easeFactor);
    expect(failed.lapses).toBe(1);
    // recovery restarts the 1 → 6 sequence
    const r1 = reviewCard(failed, 4, failed.dueAt);
    const r2 = reviewCard(r1, 4, r1.dueAt);
    expect([r1.intervalDays, r2.intervalDays]).toEqual([1, 6]);
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });

  it('failing a brand-new card is not a lapse', () => {
    const failed = reviewCard(newCardSchedule(T0), 0, T0);
    expect(failed.lapses).toBe(0);
    expect(failed.intervalDays).toBe(1);
  });

  it('dueAt = now + interval days and lastReviewedAt = now', () => {
    const next = reviewCard(newCardSchedule(T0), 4, T0);
    expect(next.dueAt.getTime()).toBe(days(1).getTime());
    expect(next.lastReviewedAt?.getTime()).toBe(T0.getTime());
  });

  it('does not mutate its input', () => {
    const card = newCardSchedule(T0);
    const snapshot = JSON.stringify(card);
    reviewCard(card, 5, T0);
    expect(JSON.stringify(card)).toBe(snapshot);
  });

  it('rejects invalid quality and invalid dates', () => {
    const card = newCardSchedule(T0);
    for (const bad of [-1, 6, 2.5, Number.NaN, Infinity]) {
      expect(() => reviewCard(card, bad, T0)).toThrow(RangeError);
    }
    expect(() => reviewCard(card, 4, new Date('nope'))).toThrow(RangeError);
  });

  it('maps the four grades to qualities', () => {
    expect(GRADE_QUALITY).toEqual({ again: 1, hard: 3, good: 4, easy: 5 });
    const good = reviewCardWithGrade(newCardSchedule(T0), 'good', T0);
    expect(good.repetitions).toBe(1);
    const again = reviewCardWithGrade(good, 'again', T0);
    expect(again.repetitions).toBe(0);
  });
});

describe('buildReviewQueue', () => {
  const mk = (id: string, due: Date, reviewed: boolean) => ({
    id,
    schedule: { ...newCardSchedule(T0), dueAt: due, lastReviewedAt: reviewed ? T0 : null },
  });

  it('excludes cards not yet due and orders reviews by most overdue first, then new cards', () => {
    const now = days(10);
    const queue = buildReviewQueue(
      [
        mk('future', days(11), true),
        mk('r-recent', days(9), true),
        mk('r-old', days(2), true),
        mk('n-1', days(5), false),
        mk('n-2', days(3), false),
      ],
      now,
    );
    expect(queue.map((c) => c.id)).toEqual(['r-old', 'r-recent', 'n-2', 'n-1']);
  });

  it('caps reviews and new cards independently', () => {
    const now = days(10);
    const cards = [
      ...Array.from({ length: 5 }, (_, i) => mk(`r${i}`, days(i), true)),
      ...Array.from({ length: 5 }, (_, i) => mk(`n${i}`, days(i), false)),
    ];
    const queue = buildReviewQueue(cards, now, { maxReviews: 2, maxNew: 1 });
    expect(queue.map((c) => c.id)).toEqual(['r0', 'r1', 'n0']);
    expect(buildReviewQueue(cards, now, { maxReviews: 0, maxNew: 0 })).toEqual([]);
  });
});
