/**
 * Notification consent, signed unsubscribe links (RFC 8058 one-click) and nudge rules.
 * Server-side only (uses node:crypto).
 *
 * Defaults: onboarding, inactivity, weekly_summary and referral are ON until the learner
 * opts out; marketing is OFF until explicit opt-in. Transactional mail (verification,
 * password reset, receipts) cannot be switched off. Every change is kept in an audit trail.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const NOTIFICATION_CATEGORIES = [
  'transactional',
  'onboarding',
  'inactivity',
  'weekly_summary',
  'referral',
  'marketing',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type OptionalCategory = Exclude<NotificationCategory, 'transactional'>;

export const isOptionalCategory = (v: unknown): v is OptionalCategory =>
  typeof v === 'string' && v !== 'transactional' && (NOTIFICATION_CATEGORIES as readonly string[]).includes(v);

export type ConsentSource = 'signup' | 'preferences' | 'unsubscribe_link' | 'admin' | 'import';

export interface ConsentEntry {
  category: OptionalCategory;
  granted: boolean;
  at: string;
  source: ConsentSource;
}

export interface NotificationPrefs {
  granted: Partial<Record<OptionalCategory, boolean>>;
  history: ConsentEntry[];
}

const HISTORY_LIMIT = 100;

export const emptyPrefs = (): NotificationPrefs => ({ granted: {}, history: [] });

export function applyConsent(
  prefs: NotificationPrefs,
  category: NotificationCategory,
  granted: boolean,
  now: Date,
  source: ConsentSource,
): NotificationPrefs {
  if (!isOptionalCategory(category)) throw new RangeError('Transactional messages cannot be switched off');
  const entry: ConsentEntry = { category, granted, at: now.toISOString(), source };
  return {
    granted: { ...prefs.granted, [category]: granted },
    history: [...prefs.history, entry].slice(-HISTORY_LIMIT),
  };
}

/** Every sender must call this before sending anything that is not transactional. */
export function canSend(prefs: NotificationPrefs, category: NotificationCategory): boolean {
  if (category === 'transactional') return true;
  const explicit = prefs.granted[category];
  if (explicit !== undefined) return explicit;
  return category !== 'marketing';
}

// ---- unsubscribe tokens -------------------------------------------------------------

const b64u = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const sign = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest();

function assertSecret(secret: string): void {
  if (typeof secret !== 'string' || secret.length < 32) throw new RangeError('Unsubscribe secret must be at least 32 characters');
}

/** Stateless, non-expiring (an unsubscribe link must keep working) and tamper-proof. */
export function createUnsubscribeToken(secret: string, userId: string, category: NotificationCategory): string {
  assertSecret(secret);
  if (!isOptionalCategory(category)) throw new RangeError('Transactional messages have no unsubscribe link');
  if (!userId) throw new RangeError('userId is required');
  const payload = b64u(JSON.stringify({ v: 1, u: userId, c: category }));
  return `${payload}.${b64u(sign(secret, payload))}`;
}

export function verifyUnsubscribeToken(
  secret: string,
  token: string,
): { userId: string; category: OptionalCategory } | null {
  assertSecret(secret);
  if (typeof token !== 'string' || token.length > 512) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, mac] = parts as [string, string];

  const expected = sign(secret, payload);
  let given: Buffer;
  try {
    given = Buffer.from(mac, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { v?: number; u?: unknown; c?: unknown };
    if (data.v !== 1 || typeof data.u !== 'string' || !data.u || !isOptionalCategory(data.c)) return null;
    return { userId: data.u, category: data.c };
  } catch {
    return null;
  }
}

/** Path-based so request-log redaction (`/unsubscribe/<token>`) hides it. */
export function buildUnsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/unsubscribe/${token}`;
}

/** Headers required by Gmail/Yahoo bulk-sender rules (RFC 8058 one-click). */
export function unsubscribeHeaders(url: string, mailto?: string): Record<string, string> {
  const targets = [`<${url}>`, ...(mailto ? [`<mailto:${mailto}>`] : [])];
  return { 'List-Unsubscribe': targets.join(', '), 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

// ---- nudge rules --------------------------------------------------------------------

export interface NudgeOptions {
  afterDays?: number;
  cooldownDays?: number;
}

const DAY_MS = 86_400_000;

/** Inactive for `afterDays`, and not nudged within the cooldown. Consent is checked separately. */
export function shouldSendInactivityNudge(
  lastActiveAt: Date | null,
  lastNudgeAt: Date | null,
  now: Date,
  options: NudgeOptions = {},
): boolean {
  const afterDays = options.afterDays ?? 7;
  const cooldownDays = options.cooldownDays ?? 14;
  if (!lastActiveAt) return false; // never active: the onboarding sequence handles this case
  if (now.getTime() - lastActiveAt.getTime() < afterDays * DAY_MS) return false;
  if (lastNudgeAt && lastNudgeAt.getTime() > lastActiveAt.getTime() && now.getTime() - lastNudgeAt.getTime() < cooldownDays * DAY_MS) {
    return false;
  }
  return true;
}

/** Onboarding steps by days since signup. */
export const ONBOARDING_STEPS = [
  { day: 0, key: 'welcome' },
  { day: 2, key: 'first_quiz' },
  { day: 5, key: 'study_planner' },
  { day: 9, key: 'flashcards' },
] as const;

export function dueOnboardingStep(signedUpAt: Date, now: Date, sentKeys: readonly string[]): string | null {
  const age = Math.floor((now.getTime() - signedUpAt.getTime()) / DAY_MS);
  const due = ONBOARDING_STEPS.filter((s) => s.day <= age && !sentKeys.includes(s.key));
  return due.length ? due[0]!.key : null; // one email at a time, oldest missing step first
}
