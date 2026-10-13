/**
 * In-process publish/subscribe for room updates (feeds the Server-Sent Events streams).
 * Single-instance only: with several API instances, replace publish/subscribe with Postgres
 * LISTEN/NOTIFY. Clients also poll every few seconds as a fallback, so a missed event only
 * delays an update.
 */
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribeRoom(code: string, listener: Listener): () => void {
  let set = listeners.get(code);
  if (!set) listeners.set(code, (set = new Set()));
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(code);
  };
}

export function publishRoom(code: string): void {
  for (const l of listeners.get(code) ?? []) l();
}
