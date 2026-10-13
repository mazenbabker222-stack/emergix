import { authLockouts, db } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';

export interface LockState {
  failedCount: number;
  lockedUntil: Date | null;
}

export interface LockPolicy {
  threshold: number;
  minutes: number;
}

export function isLocked(state: LockState | undefined, now: Date): boolean {
  return !!state?.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

/** Pure: the state after one more failed attempt. An expired lock starts a fresh count. */
export function nextLockState(prev: LockState | undefined, now: Date, policy: LockPolicy): LockState {
  const expired = !!prev?.lockedUntil && prev.lockedUntil.getTime() <= now.getTime();
  const base = !prev || expired ? 0 : prev.failedCount;
  const failedCount = base + 1;
  if (failedCount >= policy.threshold) {
    return { failedCount, lockedUntil: new Date(now.getTime() + policy.minutes * 60_000) };
  }
  return { failedCount, lockedUntil: null };
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

async function load(email: string): Promise<LockState | undefined> {
  const [row] = await db.select().from(authLockouts).where(eq(authLockouts.email, email)).limit(1);
  return row ? { failedCount: row.failedCount, lockedUntil: row.lockedUntil } : undefined;
}

export async function isEmailLocked(rawEmail: string, now = new Date()): Promise<boolean> {
  return isLocked(await load(normaliseEmail(rawEmail)), now);
}

export async function recordFailedSignIn(rawEmail: string, now = new Date()): Promise<LockState> {
  const email = normaliseEmail(rawEmail);
  const next = nextLockState(await load(email), now, {
    threshold: env.LOCKOUT_THRESHOLD,
    minutes: env.LOCKOUT_MINUTES,
  });
  await db
    .insert(authLockouts)
    .values({ email, ...next, lastFailedAt: now })
    .onConflictDoUpdate({
      target: authLockouts.email,
      set: { ...next, lastFailedAt: now },
    });
  return next;
}

export async function clearLockout(rawEmail: string): Promise<void> {
  await db.delete(authLockouts).where(eq(authLockouts.email, normaliseEmail(rawEmail)));
}
