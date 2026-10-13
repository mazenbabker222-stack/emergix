import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MIN_SAMPLE_SIZE,
  buildHistogram,
  computeBenchmark,
  percentileRank,
} from './benchmark';

const range = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));

describe('percentileRank (mid-rank)', () => {
  it('computes below + half of equal', () => {
    // 10 scores: 10..100. User 50 -> below 4, equal 1 -> (4 + 0.5)/10 = 45
    expect(percentileRank(range(10, (i) => (i + 1) * 10), 50)).toBe(45);
  });
  it('handles extremes and ties', () => {
    const s = [50, 50, 50, 50];
    expect(percentileRank(s, 50)).toBe(50);
    expect(percentileRank(s, 0)).toBe(0);
    expect(percentileRank(s, 100)).toBe(100);
  });
  it('returns null for an empty sample and ignores non-finite values', () => {
    expect(percentileRank([], 50)).toBeNull();
    expect(percentileRank([Number.NaN, Infinity], 50)).toBeNull();
    expect(percentileRank([Number.NaN, 40, 60], 50)).toBe(50);
  });
  it('rejects a non-finite user score', () => {
    expect(() => percentileRank([1, 2], Number.NaN)).toThrow(RangeError);
  });
});

describe('buildHistogram', () => {
  it('builds 10 bins of width 10 and puts 100 in the last bin', () => {
    const h = buildHistogram([0, 9.99, 10, 55, 99.9, 100]);
    expect(h).toHaveLength(10);
    expect(h[0]).toEqual({ from: 0, to: 10, count: 2 });
    expect(h[1]!.count).toBe(1);
    expect(h[5]!.count).toBe(1);
    expect(h[9]!.count).toBe(2);
    expect(h.reduce((a, b) => a + b.count, 0)).toBe(6);
  });
  it('clamps out-of-range scores and skips non-finite ones', () => {
    const h = buildHistogram([-5, 150, Number.NaN]);
    expect(h[0]!.count).toBe(1);
    expect(h[9]!.count).toBe(1);
    expect(h.reduce((a, b) => a + b.count, 0)).toBe(2);
  });
  it('supports custom ranges and validates options', () => {
    const h = buildHistogram([0.5, 1.5, 2.5, 4], { min: 0, max: 4, binCount: 4 });
    expect(h.map((b) => b.count)).toEqual([1, 1, 1, 1]);
    expect(() => buildHistogram([], { min: 5, max: 5 })).toThrow(RangeError);
    expect(() => buildHistogram([], { binCount: 0 })).toThrow(RangeError);
  });
});

describe('computeBenchmark', () => {
  const sample = (n: number) => range(n, (i) => (i * 100) / (n - 1));

  it('hides itself below the minimum sample size (default 30)', () => {
    const r = computeBenchmark(sample(DEFAULT_MIN_SAMPLE_SIZE - 1), 70);
    expect(r).toEqual({
      available: false,
      reason: 'insufficient_sample',
      sampleSize: DEFAULT_MIN_SAMPLE_SIZE - 1,
      minSampleSize: DEFAULT_MIN_SAMPLE_SIZE,
    });
    expect('percentile' in r).toBe(false);
    expect('histogram' in r).toBe(false);
  });

  it('shows at exactly the minimum sample size', () => {
    const r = computeBenchmark(sample(DEFAULT_MIN_SAMPLE_SIZE), 70);
    expect(r.available).toBe(true);
  });

  it('respects a configurable minimum and does not count invalid scores', () => {
    const scores = [...sample(10), Number.NaN, Number.NaN];
    expect(computeBenchmark(scores, 50, { minSampleSize: 10 }).available).toBe(true);
    expect(computeBenchmark(scores, 50, { minSampleSize: 11 }).available).toBe(false);
  });

  it('returns rounded percentile, histogram and the learner bin', () => {
    const scores = range(40, (i) => i * 2.5); // 0..97.5
    const r = computeBenchmark(scores, 55);
    if (!r.available) throw new Error('expected available');
    expect(r.sampleSize).toBe(40);
    expect(r.percentile).toBe(56); // (22 below + 0.5) / 40
    expect(r.histogram.reduce((a, b) => a + b.count, 0)).toBe(40);
    expect(r.userBinIndex).toBe(5);
  });

  it('puts a perfect score in the last bin', () => {
    const r = computeBenchmark(sample(50), 100);
    if (!r.available) throw new Error('expected available');
    expect(r.userBinIndex).toBe(9);
    expect(r.percentile).toBeGreaterThan(95);
  });

  it('validates inputs', () => {
    expect(() => computeBenchmark([], Number.NaN)).toThrow(RangeError);
    expect(() => computeBenchmark([], 50, { minSampleSize: 0 })).toThrow(RangeError);
    expect(() => computeBenchmark([], 50, { minSampleSize: 1.5 })).toThrow(RangeError);
  });
});
