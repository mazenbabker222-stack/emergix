export type QuizMode = "tutor" | "timed" | "custom" | "review";

export type QuizConfig = {
  preset?: "mrcem_primary_180" | "mrcem_sba_2x90" | "custom";
  sectionSize?: number;
  sectionDurationMinutes?: number;
  breakMinutes?: number;
};

export type QuizTiming = {
  currentSection: number;
  deadlineAt: Date | null;
  isOnBreak: boolean;
  canAnswer: boolean;
};

export function getQuizTiming(
  startedAt: Date,
  fallbackDeadline: Date | null,
  config: QuizConfig,
  now: Date,
): QuizTiming {
  const sectionDuration = config.sectionDurationMinutes;
  const breakMinutes = config.breakMinutes;

  if (!sectionDuration || !breakMinutes) {
    return {
      currentSection: 0,
      deadlineAt: fallbackDeadline,
      isOnBreak: false,
      canAnswer: fallbackDeadline === null || now < fallbackDeadline,
    };
  }

  const firstDeadline = new Date(startedAt.getTime() + sectionDuration * 60_000);
  const breakEnd = new Date(firstDeadline.getTime() + breakMinutes * 60_000);
  const finalDeadline = new Date(breakEnd.getTime() + sectionDuration * 60_000);

  if (now < firstDeadline) {
    return { currentSection: 0, deadlineAt: firstDeadline, isOnBreak: false, canAnswer: true };
  }
  if (now < breakEnd) {
    return { currentSection: 0, deadlineAt: breakEnd, isOnBreak: true, canAnswer: false };
  }
  if (now < finalDeadline) {
    return { currentSection: 1, deadlineAt: finalDeadline, isOnBreak: false, canAnswer: true };
  }
  return { currentSection: 1, deadlineAt: finalDeadline, isOnBreak: false, canAnswer: false };
}

export function shouldRevealFeedback(mode: QuizMode, status: string): boolean {
  return status !== "in_progress" || mode === "tutor" || mode === "review";
}

export function calculateScore(values: Array<{ isCorrect: boolean | null }>) {
  const answered = values.filter((answer) => answer.isCorrect !== null).length;
  const correct = values.filter((answer) => answer.isCorrect === true).length;
  return {
    total: values.length,
    answered,
    correct,
    percent: values.length === 0 ? 0 : Math.round((correct / values.length) * 1000) / 10,
  };
}
