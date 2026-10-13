import { describe, expect, it } from 'vitest';
import {
  REFERRAL_ALPHABET,
  REFERRAL_CODE_LENGTH,
  checkReferralRedemption,
  decideReward,
  formatReferralCode,
  generateReferralCode,
  normalizeEmailForAbuse,
  normalizeReferralCode,
  type ReferralConfig,
} from './referral';

describe('codes', () => {
  it('generates 8 unambiguous characters and is deterministic with an injected rng', () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
    expect([...code].every((c) => REFERRAL_ALPHABET.includes(c))).toBe(true);
    expect(generateReferralCode(() => 0)).toBe('AAAAAAAA');
    expect(REFERRAL_ALPHABET).not.toMatch(/[01OIL]/);
    expect(new Set(Array.from({ length: 200 }, () => generateReferralCode())).size).toBe(200);
  });
  it('normalises and validates user input', () => {
    expect(normalizeReferralCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(normalizeReferralCode('ABCD234')).toBeNull();
    expect(normalizeReferralCode('ABCD234O')).toBeNull(); // O is not in the alphabet
    expect(formatReferralCode('ABCD2345')).toBe('ABCD-2345');
  });
});

describe('abuse checks', () => {
  it('collapses plus tags and gmail dots', () => {
    expect(normalizeEmailForAbuse('Jo.Hn+promo@Gmail.com')).toBe('john@gmail.com');
    expect(normalizeEmailForAbuse('a.b@googlemail.com')).toBe('ab@gmail.com');
    expect(normalizeEmailForAbuse('a.b+x@work.org')).toBe('a.b@work.org');
  });
  const base = {
    code: 'ABCD-2345',
    referrerId: 'u1',
    referrerEmail: 'ref@example.com',
    refereeId: 'u2',
    refereeEmail: 'new@example.com',
    refereeAlreadyReferred: false,
  };
  it('accepts a valid redemption and refuses abuse', () => {
    expect(checkReferralRedemption(base)).toEqual({ ok: true });
    expect(checkReferralRedemption({ ...base, code: 'nope' })).toEqual({ ok: false, reason: 'invalid_code' });
    expect(checkReferralRedemption({ ...base, refereeId: 'u1' })).toEqual({ ok: false, reason: 'self_referral' });
    expect(checkReferralRedemption({ ...base, refereeEmail: 'ref+2@example.com' })).toEqual({
      ok: false,
      reason: 'same_person',
    });
    expect(checkReferralRedemption({ ...base, refereeAlreadyReferred: true })).toEqual({
      ok: false,
      reason: 'already_referred',
    });
  });
});

describe('decideReward', () => {
  const cfg: ReferralConfig = {
    enabled: true,
    rewardKind: 'credit',
    rewardAmount: 500,
    maxRewardsPerReferrer: 3,
    requireFirstPayment: true,
  };
  it('grants only when enabled, under the cap and after the first payment', () => {
    expect(decideReward(cfg, { rewardsGranted: 0, refereeHasPaid: true })).toEqual({ grant: true, kind: 'credit', amount: 500 });
    expect(decideReward(cfg, { rewardsGranted: 0, refereeHasPaid: false })).toEqual({ grant: false, reason: 'awaiting_first_payment' });
    expect(decideReward(cfg, { rewardsGranted: 3, refereeHasPaid: true })).toEqual({ grant: false, reason: 'cap_reached' });
    expect(decideReward({ ...cfg, enabled: false }, { rewardsGranted: 0, refereeHasPaid: true })).toEqual({ grant: false, reason: 'disabled' });
    expect(decideReward({ ...cfg, rewardAmount: 0 }, { rewardsGranted: 0, refereeHasPaid: true })).toEqual({ grant: false, reason: 'invalid_config' });
    expect(decideReward({ ...cfg, requireFirstPayment: false }, { rewardsGranted: 0, refereeHasPaid: false }).grant).toBe(true);
  });
});
