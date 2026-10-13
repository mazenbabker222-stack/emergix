/**
 * Referral codes, abuse checks and reward decisions.
 * The reward itself (amount, kind, cap) is admin-configurable and passed in as `ReferralConfig`.
 */
import { randomInt } from 'node:crypto';

/** No 0/O/1/I/L so codes survive being read aloud or typed from a screenshot. */
export const REFERRAL_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;

export function generateReferralCode(rand: (max: number) => number = randomInt): string {
  let out = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) out += REFERRAL_ALPHABET[rand(REFERRAL_ALPHABET.length)]!;
  return out;
}

/** Uppercases and strips spaces/hyphens. Returns null when the result is not a valid code. */
export function normalizeReferralCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== REFERRAL_CODE_LENGTH) return null;
  for (const ch of code) if (!REFERRAL_ALPHABET.includes(ch)) return null;
  return code;
}

export const formatReferralCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** Collapses `+tags` and Gmail dots so one person cannot refer themselves with alias addresses. */
export function normalizeEmailForAbuse(email: string): string {
  const [localRaw = '', domainRaw = ''] = email.trim().toLowerCase().split('@');
  const domain = domainRaw === 'googlemail.com' ? 'gmail.com' : domainRaw;
  let local = localRaw.split('+')[0]!;
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

export type RedeemRefusal = 'invalid_code' | 'self_referral' | 'same_person' | 'already_referred';

export function checkReferralRedemption(input: {
  code: string;
  referrerId: string;
  referrerEmail: string;
  refereeId: string;
  refereeEmail: string;
  refereeAlreadyReferred: boolean;
}): { ok: true } | { ok: false; reason: RedeemRefusal } {
  if (normalizeReferralCode(input.code) === null) return { ok: false, reason: 'invalid_code' };
  if (input.referrerId === input.refereeId) return { ok: false, reason: 'self_referral' };
  if (normalizeEmailForAbuse(input.referrerEmail) === normalizeEmailForAbuse(input.refereeEmail)) {
    return { ok: false, reason: 'same_person' };
  }
  if (input.refereeAlreadyReferred) return { ok: false, reason: 'already_referred' };
  return { ok: true };
}

export interface ReferralConfig {
  enabled: boolean;
  rewardKind: 'credit' | 'free_days';
  /** Minor currency units for `credit` (e.g. pence), days for `free_days`. */
  rewardAmount: number;
  maxRewardsPerReferrer: number;
  /** Reward only after the referee's first successful payment. */
  requireFirstPayment: boolean;
}

export type RewardDecision =
  | { grant: true; kind: ReferralConfig['rewardKind']; amount: number }
  | { grant: false; reason: 'disabled' | 'cap_reached' | 'awaiting_first_payment' | 'invalid_config' };

export function decideReward(
  config: ReferralConfig,
  state: { rewardsGranted: number; refereeHasPaid: boolean },
): RewardDecision {
  if (!config.enabled) return { grant: false, reason: 'disabled' };
  if (!Number.isInteger(config.rewardAmount) || config.rewardAmount <= 0) return { grant: false, reason: 'invalid_config' };
  if (state.rewardsGranted >= config.maxRewardsPerReferrer) return { grant: false, reason: 'cap_reached' };
  if (config.requireFirstPayment && !state.refereeHasPaid) return { grant: false, reason: 'awaiting_first_payment' };
  return { grant: true, kind: config.rewardKind, amount: config.rewardAmount };
}
