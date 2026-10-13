/**
 * Weekly study-plan generator (pure and deterministic).
 *
 * - Time budget: `hoursPerWeek` is spread over the non-rest weekdays using an accumulator,
 *   so the long-run total matches the budget exactly (within one slot).
 * - Weak topics (low mastery) receive proportionally more slots (smooth weighted round-robin).
 * - The last `revisionDays` study days are revision-only on the weakest topics.
 * - The day before the exam is a rest day; the exam day itself has no items.
 */
import { addDays, dayDiff, weekdayOf } from './streak';

export type PlanItemKind = 'qbank' | 'lesson' | 'osce' | 'flashcards' | 'revision' | 'rest';

export interface PlanTopic {
  id: string | null;
  title: string;
  /** 0 (weak) .. 1 (mastered), e.g. the learner's accuracy on the topic. */
  mastery: number;
  hasLessons?: boolean;
}

export interface PlanInput {
  /** Local `YYYY-MM-DD`. */
  today: string;
  examDate: string;
  hoursPerWeek: number;
  topics: readonly PlanTopic[];
  /** 0 = Sunday … 6. Default [0]. */
  restWeekdays?: readonly number[];
  slotMinutes?: number;
  revisionDays?: number;
}

export interface PlanItem {
  topicId: string | null;
  kind: PlanItemKind;
  title: string;
  scheduledFor: string;
  estimatedMinutes: number;
}

const LABEL: Record<PlanItemKind, string> = {
  qbank: 'Practice questions',
  lesson: 'Lesson',
  osce: 'OSCE practice',
  flashcards: 'Flashcard review',
  revision: 'Revision',
  rest: 'Rest day',
};

const MAX_HORIZON_DAYS = 400;

export function generatePlan(input: PlanInput): PlanItem[] {
  const slotMinutes = input.slotMinutes ?? 30;
  const restWeekdays = [...new Set(input.restWeekdays ?? [0])];
  const revisionDaysCfg = input.revisionDays ?? 3;

  if (!Number.isFinite(input.hoursPerWeek) || input.hoursPerWeek <= 0 || input.hoursPerWeek > 80) {
    throw new RangeError('hoursPerWeek must be between 0 and 80');
  }
  if (!Number.isInteger(slotMinutes) || slotMinutes < 5 || slotMinutes > 120) {
    throw new RangeError('slotMinutes must be an integer between 5 and 120');
  }
  if (restWeekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) || restWeekdays.length > 6) {
    throw new RangeError('restWeekdays must be unique weekdays 0-6 with at least one study day');
  }
  if (input.topics.length === 0) throw new RangeError('At least one topic is required');

  const daysToExam = dayDiff(input.today, input.examDate);
  if (daysToExam < 1) throw new RangeError('The exam date must be after today');
  if (daysToExam > MAX_HORIZON_DAYS) throw new RangeError(`The exam date is more than ${MAX_HORIZON_DAYS} days away`);

  const weeklySlots = Math.max(1, Math.floor((input.hoursPerWeek * 60) / slotMinutes));
  const studyDaysPerWeek = 7 - restWeekdays.length;
  const slotsPerStudyDay = weeklySlots / studyDaysPerWeek;

  const weights = input.topics.map((t) => 1 - clamp01(t.mastery) + 0.1);
  const credits = input.topics.map(() => 0);
  const kindCounter = input.topics.map(() => 0);
  const weakestPool = input.topics
    .map((t, i) => ({ i, m: clamp01(t.mastery) }))
    .sort((a, b) => a.m - b.m || a.i - b.i)
    .slice(0, Math.max(1, Math.min(3, Math.ceil(input.topics.length / 2))))
    .map((x) => x.i);

  const eve = addDays(input.examDate, -1);
  const merged = new Map<string, PlanItem>();
  const order: string[] = [];
  const push = (item: PlanItem) => {
    const key = `${item.scheduledFor}|${item.topicId ?? ''}|${item.kind}|${item.title}`;
    const existing = merged.get(key);
    if (existing) existing.estimatedMinutes += item.estimatedMinutes;
    else {
      merged.set(key, { ...item });
      order.push(key);
    }
  };

  let acc = 0;
  for (let day = input.today; day <= eve; day = addDays(day, 1)) {
    if (day === eve && daysToExam >= 2) {
      push({ topicId: null, kind: 'rest', title: LABEL.rest, scheduledFor: day, estimatedMinutes: 0 });
      continue;
    }
    if (restWeekdays.includes(weekdayOf(day))) continue;

    acc += slotsPerStudyDay;
    const slots = Math.floor(acc + 1e-9);
    acc -= slots;
    if (slots === 0) continue;

    const revision = dayDiff(day, input.examDate) <= revisionDaysCfg + 1;
    const pool = revision ? weakestPool : input.topics.map((_, i) => i);
    const poolWeight = pool.reduce((s, i) => s + weights[i]!, 0);

    for (let s = 0; s < slots; s++) {
      for (const i of pool) credits[i]! += weights[i]!;
      let pick = pool[0]!;
      for (const i of pool) if (credits[i]! > credits[pick]!) pick = i;
      credits[pick]! -= poolWeight;

      const topic = input.topics[pick]!;
      let kind: PlanItemKind = 'revision';
      if (!revision) {
        const seq: PlanItemKind[] = topic.hasLessons
          ? ['lesson', 'qbank', 'flashcards', 'qbank']
          : ['qbank', 'flashcards', 'qbank'];
        kind = seq[kindCounter[pick]! % seq.length]!;
        kindCounter[pick]! += 1;
      }
      push({
        topicId: topic.id,
        kind,
        title: `${LABEL[kind]}: ${topic.title}`,
        scheduledFor: day,
        estimatedMinutes: slotMinutes,
      });
    }
  }

  return order.map((k) => merged.get(k)!);
}

export function planCompletion(items: readonly { kind: PlanItemKind; completedAt?: Date | null }[]) {
  const work = items.filter((i) => i.kind !== 'rest');
  const done = work.filter((i) => i.completedAt).length;
  return { total: work.length, done, fraction: work.length === 0 ? 0 : done / work.length };
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
