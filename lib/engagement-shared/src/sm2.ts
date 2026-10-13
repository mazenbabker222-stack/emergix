/**
 * SM-2 spaced repetition (Piotr Wozniak, SuperMemo-2).
 *
 * Pure functions only: no I/O, no clock access (`now` is always injected), so the
 * API, the web app and the tests share one implementation.
 *
 * Reference behaviour implemented here:
 *  - quality q is an integer 0..5; q >= 3 is a successful recall.
 *  - Successful recall: repetition 0 -> 1 day, repetition 1 -> 6 days,
 *    afterwards interval = round(previousInterval * easeFactorBeforeThisReview).
 *  - Failed recall (q < 3): repetitions reset to 0, interval = 1 day and the
 *    ease factor is NOT changed (as in the original SM-2 description).
 *  - On success: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), min 1.3.
 *  - The initial ease factor is 2.5.
 */

export const MIN_EASE_FACTOR = 1.3;
export const INITIAL_EASE_FACTOR = 2.5;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** The four buttons shown in the review UI, mapped to SM-2 qualities. */
export const GRADE_QUALITY = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
} as const satisfies Record<string, Quality>;

export type Grade = keyof typeof GRADE_QUALITY;

export interface CardSchedule {
  easeFactor: number;
  /** Days until the next review (0 for a card that has never been reviewed). */
  intervalDays: number;
  /** Consecutive successful reviews. */
  repetitions: number;
  /** Number of times the card was failed after being learned. */
  lapses: number;
  dueAt: Date;
  lastReviewedAt: Date | null;
}

export function newCardSchedule(now: Date): CardSchedule {
  return {
    easeFactor: INITIAL_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: new Date(now.getTime()),
    lastReviewedAt: null,
  };
}

export function isQuality(value: unknown): value is Quality {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;
}

/** Ease factor after a successful review with quality `q` (3..5). */
export function nextEaseFactor(easeFactor: number, quality: Quality): number {
  const d = 5 - quality;
  const next = easeFactor + (0.1 - d * (0.08 + d * 0.02));
  return Math.max(MIN_EASE_FACTOR, round4(next));
}

/** Applies one review and returns the new schedule. Never mutates its input. */
export function reviewCard(card: CardSchedule, quality: number, now: Date): CardSchedule {
  if (!isQuality(quality)) {
    throw new RangeError(`SM-2 quality must be an integer between 0 and 5, got ${quality}`);
  }
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('`now` must be a valid date');
  }

  let { easeFactor, intervalDays, repetitions, lapses } = card;

  if (quality >= 3) {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
    easeFactor = nextEaseFactor(easeFactor, quality);
  } else {
    if (repetitions > 0) lapses += 1;
    repetitions = 0;
    intervalDays = 1;
  }

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    dueAt: new Date(now.getTime() + intervalDays * MS_PER_DAY),
    lastReviewedAt: new Date(now.getTime()),
  };
}

export function reviewCardWithGrade(card: CardSchedule, grade: Grade, now: Date): CardSchedule {
  return reviewCard(card, GRADE_QUALITY[grade], now);
}

export interface QueueOptions {
  /** Maximum number of already-learned cards due today. Default 200. */
  maxReviews?: number;
  /** Maximum number of never-reviewed cards introduced today. Default 20. */
  maxNew?: number;
}

export interface QueueItem<T> {
  id: string;
  card: T;
}

/**
 * Builds the daily review queue: due reviews first (most overdue first), then new cards
 * (oldest due first), each capped by its own limit. Cards not yet due are excluded.
 */
export function buildReviewQueue<T extends { id: string; schedule: CardSchedule }>(
  cards: readonly T[],
  now: Date,
  options: QueueOptions = {},
): T[] {
  const maxReviews = options.maxReviews ?? 200;
  const maxNew = options.maxNew ?? 20;
  const t = now.getTime();

  const due = cards.filter((c) => c.schedule.dueAt.getTime() <= t);
  const byDue = (a: T, b: T) =>
    a.schedule.dueAt.getTime() - b.schedule.dueAt.getTime() || a.id.localeCompare(b.id);

  const reviews = due.filter((c) => c.schedule.lastReviewedAt !== null).sort(byDue).slice(0, Math.max(0, maxReviews));
  const fresh = due.filter((c) => c.schedule.lastReviewedAt === null).sort(byDue).slice(0, Math.max(0, maxNew));

  return [...reviews, ...fresh];
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
