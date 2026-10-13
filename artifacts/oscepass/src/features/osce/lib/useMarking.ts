import { useCallback, useEffect, useRef, useState } from 'react';
import type { OsceMarksInput, Phase06OsceAttempt } from '@workspace/api-client-react';

export interface MarkingState {
  marks: Record<string, number>;
  globalRating: OsceMarksInput['globalRating'];
  notes: string;
}

export const EMPTY_MARKING: MarkingState = { marks: {}, globalRating: null, notes: '' };

/**
 * Marking sheet state with debounced autosave. `initial` is the saved draft (or undefined when
 * there is none); the hook adopts it once `ready` is true, so a refresh restores the marks.
 * `save` persists to the server (draft endpoint, room endpoint, ...).
 */
export function useAutosavedMarking(options: {
  ready: boolean;
  initial: Phase06OsceAttempt | undefined;
  save: (input: OsceMarksInput) => Promise<unknown>;
  mode?: 'learning' | 'exam';
  delayMs?: number;
}) {
  const { ready, initial, save, mode = 'exam', delayMs = 600 } = options;
  const [state, setState] = useState<MarkingState>(EMPTY_MARKING);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const adopted = useRef(false);
  const timer = useRef<number | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (ready && !adopted.current) {
      adopted.current = true;
      if (initial) setState({ marks: initial.marks, globalRating: initial.globalRating, notes: initial.notes ?? '' });
    }
  }, [ready, initial]);

  const flush = useCallback(async (next: MarkingState) => {
    setStatus('saving');
    try {
      await saveRef.current({ marks: next.marks, globalRating: next.globalRating, notes: next.notes || null, mode });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [mode]);

  const update = useCallback((next: MarkingState) => {
    setState(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(next), delayMs);
  }, [flush, delayMs]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const reset = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setState(EMPTY_MARKING);
    setStatus('idle');
  }, []);

  const statusText = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Could not save. Check your connection.' : undefined;
  return { state, update, reset, status, statusText, flush };
}
