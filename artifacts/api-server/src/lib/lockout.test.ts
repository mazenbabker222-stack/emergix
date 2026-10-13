import { describe, expect, it } from 'vitest';
import { isLocked, nextLockState, normaliseEmail } from './lockout';

const policy = { threshold: 3, minutes: 15 };
const t0 = new Date('2026-01-01T10:00:00Z');
const minutesLater = (m: number) => new Date(t0.getTime() + m * 60_000);

describe('nextLockState', () => {
  it('counts failures and locks at the threshold', () => {
    let state = nextLockState(undefined, t0, policy);
    expect(state).toEqual({ failedCount: 1, lockedUntil: null });
    state = nextLockState(state, t0, policy);
    expect(state.lockedUntil).toBeNull();
    state = nextLockState(state, t0, policy);
    expect(state.failedCount).toBe(3);
    expect(state.lockedUntil).toEqual(minutesLater(15));
    expect(isLocked(state, minutesLater(14))).toBe(true);
    expect(isLocked(state, minutesLater(15))).toBe(false);
  });

  it('starts a fresh count once a lock has expired', () => {
    const locked = { failedCount: 3, lockedUntil: minutesLater(15) };
    expect(nextLockState(locked, minutesLater(16), policy)).toEqual({ failedCount: 1, lockedUntil: null });
  });

  it('normalises e-mail so case and spaces cannot dodge the lock', () => {
    expect(normaliseEmail('  Learner@Example.COM ')).toBe('learner@example.com');
  });
});
