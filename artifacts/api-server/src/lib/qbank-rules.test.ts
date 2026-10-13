import { describe, expect, it } from "vitest";
import { calculateScore, getQuizTiming, shouldRevealFeedback } from "./qbank-rules";

describe("question-bank rules", () => {
  const startedAt = new Date("2026-01-01T00:00:00.000Z");
  const config = { sectionSize: 90, sectionDurationMinutes: 120, breakMinutes: 60 };

  it("locks the second SBA section during the scheduled break", () => {
    const timing = getQuizTiming(startedAt, null, config, new Date("2026-01-01T02:30:00.000Z"));
    expect(timing.currentSection).toBe(0);
    expect(timing.isOnBreak).toBe(true);
    expect(timing.canAnswer).toBe(false);
    expect(timing.deadlineAt?.toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });

  it("unlocks the next SBA section only after the break", () => {
    const timing = getQuizTiming(startedAt, null, config, new Date("2026-01-01T03:00:00.000Z"));
    expect(timing.currentSection).toBe(1);
    expect(timing.isOnBreak).toBe(false);
    expect(timing.canAnswer).toBe(true);
  });

  it("never reveals timed answers until the session is complete", () => {
    expect(shouldRevealFeedback("timed", "in_progress")).toBe(false);
    expect(shouldRevealFeedback("timed", "completed")).toBe(true);
    expect(shouldRevealFeedback("tutor", "in_progress")).toBe(true);
  });

  it("scores unanswered questions as incorrect without counting them as answered", () => {
    expect(calculateScore([{ isCorrect: true }, { isCorrect: false }, { isCorrect: null }])).toEqual({
      total: 3,
      answered: 2,
      correct: 1,
      percent: 33.3,
    });
  });
});
