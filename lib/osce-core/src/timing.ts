/** Phase timing for a single station practice (also used by partner rooms). */

export type StationPhase = 'reading' | 'history' | 'examiner' | 'finished';

export interface StationTiming {
  readingSeconds: number;
  historySeconds: number;
  examinerSeconds: number;
}

export const DEFAULT_STATION_TIMING: StationTiming = {
  readingSeconds: 60,
  historySeconds: 480,
  examinerSeconds: 120,
};

/** The visual and audible warning starts when this many seconds remain in a phase. */
export const WARNING_SECONDS = 60;

export interface PhaseState {
  phase: StationPhase;
  /** Seconds left in the current phase (0 when finished). */
  remaining: number;
  /** Total length of the current phase. */
  duration: number;
  /** Seconds left in the whole station. */
  totalRemaining: number;
  warning: boolean;
}

export const PHASE_LABELS: Record<StationPhase, string> = {
  reading: 'Reading',
  history: 'History taking',
  examiner: 'Examiner questions',
  finished: 'Time up',
};

export function totalSeconds(timing: StationTiming): number {
  return timing.readingSeconds + timing.historySeconds + timing.examinerSeconds;
}

/**
 * Where are we after `elapsedSeconds` of running time? Pure and monotonic, so the same
 * answer is produced on every device when the elapsed time comes from the server clock.
 */
export function phaseAt(timing: StationTiming, elapsedSeconds: number): PhaseState {
  const elapsed = Math.max(0, elapsedSeconds);
  const total = totalSeconds(timing);
  const order: [StationPhase, number][] = [
    ['reading', timing.readingSeconds],
    ['history', timing.historySeconds],
    ['examiner', timing.examinerSeconds],
  ];
  let start = 0;
  for (const [phase, duration] of order) {
    if (duration <= 0) continue;
    if (elapsed < start + duration) {
      const remaining = Math.ceil(start + duration - elapsed);
      return { phase, remaining, duration, totalRemaining: Math.ceil(total - elapsed), warning: remaining <= WARNING_SECONDS };
    }
    start += duration;
  }
  return { phase: 'finished', remaining: 0, duration: 0, totalRemaining: 0, warning: false };
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm < 10 ? '0' : ''}${mm}:${ss < 10 ? '0' : ''}${ss}`;
}
