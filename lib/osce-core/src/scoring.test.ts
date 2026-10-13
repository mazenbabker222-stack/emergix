import { describe, expect, it } from 'vitest';
import {
  aggregateByDomainName,
  clampMark,
  isGlobalRating,
  maxTotal,
  percentage,
  sumMarks,
  validateMarks,
} from './scoring';

const domains = [
  { id: 'a', maxMarks: 2 },
  { id: 'b', maxMarks: 3 },
  { id: 'c', maxMarks: 1 },
];

describe('scoring', () => {
  it('sums marks and totals the maximum', () => {
    expect(maxTotal(domains)).toBe(6);
    expect(sumMarks(domains, { a: 2, b: 1 })).toBe(3);
    expect(sumMarks(domains, {})).toBe(0);
  });

  it('clamps out-of-range and invalid values when summing', () => {
    expect(clampMark(9, 3)).toBe(3);
    expect(clampMark(-4, 3)).toBe(0);
    expect(clampMark(Number.NaN, 3)).toBe(0);
    expect(clampMark('2', 3)).toBe(0);
    expect(sumMarks(domains, { a: 50, b: -1, zzz: 4 })).toBe(2);
  });

  it('validates submitted marks strictly', () => {
    const ok = validateMarks(domains, { a: 1, c: 1 });
    expect(ok.ok).toBe(true);
    expect(ok.total).toBe(2);
    expect(ok.maxTotal).toBe(6);

    const bad = validateMarks(domains, { a: 3, b: 1.5, nope: 1, c: '1' });
    expect(bad.ok).toBe(false);
    expect(bad.errors).toHaveLength(4);
    expect(bad.marks).toEqual({});
  });

  it('knows the four global ratings', () => {
    for (const r of ['Clear pass', 'Pass', 'Borderline', 'Fail']) expect(isGlobalRating(r)).toBe(true);
    expect(isGlobalRating('Not rated')).toBe(false);
    expect(isGlobalRating(undefined)).toBe(false);
  });

  it('computes percentages safely', () => {
    expect(percentage(15, 20)).toBe(75);
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(5, 0)).toBe(0);
  });

  it('aggregates by domain name across stations', () => {
    const result = aggregateByDomainName([
      { domains: [{ name: 'Open questioning', maxMarks: 2, mark: 1 }, { name: 'Summary', maxMarks: 2, mark: 2 }] },
      { domains: [{ name: 'Open questioning', maxMarks: 2, mark: 2 }] },
    ]);
    expect(result).toEqual([
      { domain: 'Open questioning', awarded: 3, max: 4 },
      { domain: 'Summary', awarded: 2, max: 2 },
    ]);
  });
});
