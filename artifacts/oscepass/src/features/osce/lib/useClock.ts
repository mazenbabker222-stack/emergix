import { useEffect, useRef, useState } from 'react';

/** Re-renders every `intervalMs` and returns Date.now(). */
export function useNow(intervalMs = 250, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

/**
 * Elapsed seconds of a server-driven clock. The server sends `elapsedSeconds` as of the moment
 * the response was produced; between responses we add local time passed. Every refetch
 * re-anchors the clock to the server, so drift cannot build up.
 */
export function useServerElapsed(elapsedSeconds: number | undefined, receivedAtMs: number, running: boolean): number {
  const now = useNow(250, running);
  if (elapsedSeconds === undefined) return 0;
  return running ? elapsedSeconds + Math.max(0, now - receivedAtMs) / 1000 : elapsedSeconds;
}

/** Local stopwatch used by single-station practice (pause/resume/reset). */
export function useStopwatch() {
  const [running, setRunning] = useState(false);
  const [base, setBase] = useState(0); // seconds accumulated before the current run
  const startedAt = useRef<number | null>(null);
  const now = useNow(200, running);
  const elapsed = running && startedAt.current !== null ? base + Math.max(0, now - startedAt.current) / 1000 : base;
  return {
    elapsed,
    running,
    start() {
      startedAt.current = Date.now();
      setRunning(true);
    },
    pause() {
      if (startedAt.current !== null) setBase((b) => b + (Date.now() - startedAt.current!) / 1000);
      startedAt.current = null;
      setRunning(false);
    },
    reset() {
      startedAt.current = null;
      setBase(0);
      setRunning(false);
    },
  };
}
