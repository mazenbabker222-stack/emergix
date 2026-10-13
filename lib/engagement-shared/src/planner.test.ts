import { describe, expect, it } from 'vitest';
import { generatePlan, planCompletion, type PlanTopic } from './planner';
import { addDays, dayDiff, weekdayOf } from './streak';

const TODAY = '2026-10-12'; // Monday
const EXAM = '2026-12-14'; // Monday, 63 days later
const topics: PlanTopic[] = [
  { id: 'cardio', title: 'Cardiology', mastery: 0.2, hasLessons: true },
  { id: 'neuro', title: 'Neurology', mastery: 0.9 },
  { id: 'resp', title: 'Respiratory', mastery: 0.5, hasLessons: true },
];
const plan = (over: Partial<Parameters<typeof generatePlan>[0]> = {}) =>
  generatePlan({ today: TODAY, examDate: EXAM, hoursPerWeek: 10, topics, ...over });
const minutes = (items: ReturnType<typeof plan>, pred: (i: ReturnType<typeof plan>[number]) => boolean = () => true) =>
  items.filter(pred).reduce((s, i) => s + i.estimatedMinutes, 0);

describe('generatePlan', () => {
  it('matches the weekly hours budget over the whole plan (within one slot)', () => {
    const items = plan();
    const studyDays = Array.from({ length: 62 }, (_, i) => addDays(TODAY, i)).filter(
      (day) => weekdayOf(day) !== 0 && day !== addDays(EXAM, -1),
    ).length;
    const expected = Math.floor((studyDays * 20) / 6) * 30; // 20 slots/week over 6 study days
    expect(Math.abs(minutes(items) - expected)).toBeLessThanOrEqual(30);
  });

  it('never schedules study on rest weekdays, items stay inside [today, eve]', () => {
    const items = plan({ restWeekdays: [0, 6] });
    for (const i of items) {
      if (i.kind === 'rest') continue;
      expect([0, 6]).not.toContain(weekdayOf(i.scheduledFor));
    }
    expect(items.every((i) => i.scheduledFor >= TODAY && i.scheduledFor < EXAM)).toBe(true);
  });

  it('gives weak topics more time than strong ones', () => {
    const items = plan({ revisionDays: 0 });
    const by = (id: string) => minutes(items, (i) => i.topicId === id);
    expect(by('cardio')).toBeGreaterThan(by('resp'));
    expect(by('resp')).toBeGreaterThan(by('neuro'));
    expect(by('neuro')).toBeGreaterThan(0);
  });

  it('uses lessons only for topics that have them', () => {
    const items = plan();
    expect(items.some((i) => i.kind === 'lesson' && i.topicId === 'cardio')).toBe(true);
    expect(items.some((i) => i.kind === 'lesson' && i.topicId === 'neuro')).toBe(false);
  });

  it('ends with revision on the weakest topics, then a rest day before the exam', () => {
    const items = plan();
    const eve = addDays(EXAM, -1);
    expect(items.at(-1)).toMatchObject({ kind: 'rest', scheduledFor: eve, estimatedMinutes: 0 });
    const lastStudy = items.filter((i) => i.kind !== 'rest' && dayDiff(i.scheduledFor, EXAM) <= 4);
    expect(lastStudy.length).toBeGreaterThan(0);
    expect(lastStudy.every((i) => i.kind === 'revision')).toBe(true);
    expect(lastStudy.every((i) => i.topicId !== 'neuro')).toBe(true); // strongest topic is skipped
    expect(items.some((i) => i.scheduledFor === EXAM)).toBe(false);
  });

  it('is deterministic and merges same-day slots of one topic', () => {
    expect(plan()).toEqual(plan());
    const items = plan({ hoursPerWeek: 30 });
    const keys = items.map((i) => `${i.scheduledFor}|${i.topicId}|${i.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('handles very short horizons', () => {
    const one = generatePlan({ today: TODAY, examDate: addDays(TODAY, 1), hoursPerWeek: 10, topics });
    expect(one.length).toBeGreaterThan(0);
    expect(one.every((i) => i.kind === 'revision' && i.scheduledFor === TODAY)).toBe(true); // exam tomorrow: revise today
    const two = generatePlan({ today: TODAY, examDate: addDays(TODAY, 2), hoursPerWeek: 10, topics });
    expect(two.at(-1)!.kind).toBe('rest');
  });

  it('validates input', () => {
    expect(() => plan({ examDate: TODAY })).toThrow(RangeError);
    expect(() => plan({ examDate: '2020-01-01' })).toThrow(RangeError);
    expect(() => plan({ examDate: '2030-01-01' })).toThrow(RangeError);
    expect(() => plan({ hoursPerWeek: 0 })).toThrow(RangeError);
    expect(() => plan({ topics: [] })).toThrow(RangeError);
    expect(() => plan({ restWeekdays: [0, 1, 2, 3, 4, 5, 6] })).toThrow(RangeError);
    expect(() => plan({ slotMinutes: 1 })).toThrow(RangeError);
  });
});

describe('planCompletion', () => {
  it('ignores rest days', () => {
    expect(
      planCompletion([
        { kind: 'qbank', completedAt: new Date() },
        { kind: 'lesson', completedAt: null },
        { kind: 'rest' },
      ]),
    ).toEqual({ total: 2, done: 1, fraction: 0.5 });
    expect(planCompletion([]).fraction).toBe(0);
  });
});
