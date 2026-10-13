import { useEffect, useRef } from 'react';
import { PHASE_LABELS, formatClock, type PhaseState } from '@workspace/osce-core';
import { beep } from '../lib/audio';

/**
 * Countdown display with a visual warning (colour + text, not colour alone) and an audible
 * cue when a phase enters its last minute and when it ends. The live region only announces
 * phase changes, never every second.
 */
export function PhaseTimer({ state, running, label }: { state: PhaseState; running: boolean; label?: string }) {
  const last = useRef<{ phase: string; warned: boolean } | null>(null);
  useEffect(() => {
    const prev = last.current;
    if (running && prev) {
      if (prev.phase !== state.phase && state.phase !== 'reading') beep(state.phase === 'finished' ? 3 : 2, state.phase === 'finished' ? 660 : 880);
      else if (prev.phase === state.phase && !prev.warned && state.warning && state.phase !== 'finished' && state.duration > 60) beep(1, 520);
    }
    last.current = { phase: state.phase, warned: state.warning };
  }, [state.phase, state.warning, state.duration, running]);

  const text = label ?? PHASE_LABELS[state.phase];
  return (
    <div className={`osce-timer${state.warning && state.phase !== 'finished' ? ' is-warning' : ''}`}>
      <div className="osce-timer-clock" role="timer" aria-label={`${text}: ${formatClock(state.remaining)} remaining`}>{formatClock(state.remaining)}</div>
      <p className="osce-timer-phase">{text}</p>
      {state.warning && state.phase !== 'finished' && <p className="osce-timer-warn">Last minute of this phase</p>}
      <p className="sr-only" aria-live="polite">{state.phase === 'finished' ? 'Time is up' : `Phase: ${text}`}</p>
    </div>
  );
}
