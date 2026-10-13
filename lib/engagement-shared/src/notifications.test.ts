import { describe, expect, it } from 'vitest';
import {
  applyConsent,
  buildUnsubscribeUrl,
  canSend,
  createUnsubscribeToken,
  dueOnboardingStep,
  emptyPrefs,
  shouldSendInactivityNudge,
  unsubscribeHeaders,
  verifyUnsubscribeToken,
} from './notifications';

const SECRET = 'x'.repeat(40);
const now = new Date('2026-10-12T10:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe('consent', () => {
  it('defaults: transactional always, marketing off, others on', () => {
    const p = emptyPrefs();
    expect(canSend(p, 'transactional')).toBe(true);
    expect(canSend(p, 'marketing')).toBe(false);
    expect(canSend(p, 'weekly_summary')).toBe(true);
    expect(canSend(p, 'inactivity')).toBe(true);
  });
  it('records opt-ins/outs with source and time, without mutating', () => {
    const p0 = emptyPrefs();
    const p1 = applyConsent(p0, 'marketing', true, now, 'signup');
    const p2 = applyConsent(p1, 'weekly_summary', false, now, 'unsubscribe_link');
    expect(p0.history).toHaveLength(0);
    expect(canSend(p2, 'marketing')).toBe(true);
    expect(canSend(p2, 'weekly_summary')).toBe(false);
    expect(p2.history).toEqual([
      { category: 'marketing', granted: true, at: now.toISOString(), source: 'signup' },
      { category: 'weekly_summary', granted: false, at: now.toISOString(), source: 'unsubscribe_link' },
    ]);
  });
  it('cannot switch off transactional mail and caps history', () => {
    expect(() => applyConsent(emptyPrefs(), 'transactional', false, now, 'preferences')).toThrow(RangeError);
    let p = emptyPrefs();
    for (let i = 0; i < 150; i++) p = applyConsent(p, 'marketing', i % 2 === 0, now, 'preferences');
    expect(p.history).toHaveLength(100);
  });
});

describe('unsubscribe tokens', () => {
  it('round-trips user and category', () => {
    const t = createUnsubscribeToken(SECRET, 'user_1', 'weekly_summary');
    expect(verifyUnsubscribeToken(SECRET, t)).toEqual({ userId: 'user_1', category: 'weekly_summary' });
  });
  it('rejects tampering, wrong secret and garbage', () => {
    const t = createUnsubscribeToken(SECRET, 'user_1', 'marketing');
    const [payload, mac] = t.split('.') as [string, string];
    const other = createUnsubscribeToken(SECRET, 'user_2', 'marketing').split('.')[0]!;
    expect(verifyUnsubscribeToken(SECRET, `${other}.${mac}`)).toBeNull(); // swapped payload
    expect(verifyUnsubscribeToken(SECRET, `${payload}.${mac.slice(0, -2)}AA`)).toBeNull();
    expect(verifyUnsubscribeToken('y'.repeat(40), t)).toBeNull();
    for (const bad of ['', 'abc', 'a.b.c', '.', `${payload}.`, 'x'.repeat(600)]) {
      expect(verifyUnsubscribeToken(SECRET, bad)).toBeNull();
    }
  });
  it('never mints tokens for transactional mail and requires a strong secret', () => {
    expect(() => createUnsubscribeToken(SECRET, 'u', 'transactional')).toThrow(RangeError);
    expect(() => createUnsubscribeToken('short', 'u', 'marketing')).toThrow(RangeError);
    expect(() => verifyUnsubscribeToken('short', 'a.b')).toThrow(RangeError);
  });
  it('builds a path-based link and one-click headers', () => {
    const url = buildUnsubscribeUrl('https://app.example.com/', 'tok.en');
    expect(url).toBe('https://app.example.com/unsubscribe/tok.en');
    expect(unsubscribeHeaders(url, 'unsub@example.com')).toEqual({
      'List-Unsubscribe': '<https://app.example.com/unsubscribe/tok.en>, <mailto:unsub@example.com>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
});

describe('nudges and onboarding', () => {
  it('nudges after inactivity, respecting the cooldown and never-active users', () => {
    expect(shouldSendInactivityNudge(daysAgo(3), null, now)).toBe(false);
    expect(shouldSendInactivityNudge(daysAgo(8), null, now)).toBe(true);
    expect(shouldSendInactivityNudge(daysAgo(20), daysAgo(5), now)).toBe(false); // nudged recently
    expect(shouldSendInactivityNudge(daysAgo(30), daysAgo(15), now)).toBe(true);
    expect(shouldSendInactivityNudge(daysAgo(10), daysAgo(40), now)).toBe(true); // old nudge before last activity
    expect(shouldSendInactivityNudge(null, null, now)).toBe(false);
  });
  it('sends one due onboarding step at a time', () => {
    expect(dueOnboardingStep(daysAgo(0), now, [])).toBe('welcome');
    expect(dueOnboardingStep(daysAgo(6), now, ['welcome'])).toBe('first_quiz');
    expect(dueOnboardingStep(daysAgo(6), now, ['welcome', 'first_quiz'])).toBe('study_planner');
    expect(dueOnboardingStep(daysAgo(30), now, ['welcome', 'first_quiz', 'study_planner', 'flashcards'])).toBeNull();
    expect(dueOnboardingStep(daysAgo(1), now, ['welcome'])).toBeNull();
  });
});
