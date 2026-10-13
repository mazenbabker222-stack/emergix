/**
 * Anonymous peer benchmarking: percentile rank and score histogram.
 *
 * The nightly job supplies one score per learner (0..100) for an exam or topic. These
 * functions never expose individual scores and refuse to produce any result when the
 * sample is smaller than the configured minimum, so small groups cannot be re-identified.
 */

export const DEFAULT_MIN_SAMPLE_SIZE = 30;
export const DEFAULT_BIN_COUNT = 10;

export interface HistogramBin {
  /** Inclusive lower bound. */
  from: number;
  /** Exclusive upper bound, except for the last bin where it is inclusive. */
  to: number;
  count: number;
}

export interface HistogramOptions {
  min?: number;
  max?: number;
  binCount?: number;
}

export function buildHistogram(scores: readonly number[], options: HistogramOptions = {}): HistogramBin[] {
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  const binCount = options.binCount ?? DEFAULT_BIN_COUNT;
  if (!(max > min)) throw new RangeError('`max` must be greater than `min`');
  if (!Number.isInteger(binCount) || binCount < 1) throw new RangeError('`binCount` must be a positive integer');

  const width = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    from: round6(min + i * width),
    to: round6(min + (i + 1) * width),
    count: 0,
  }));

  for (const raw of scores) {
    if (!Number.isFinite(raw)) continue;
    const score = clamp(raw, min, max);
    bins[binIndex(score, min, max, binCount)]!.count += 1;
  }
  return bins;
}

/**
 * Percentile rank using the mid-rank definition:
 * (scores below + half of scores equal) / total * 100. Result is in [0, 100].
 * Returns null for an empty sample.
 */
export function percentileRank(scores: readonly number[], userScore: number): number | null {
  assertScore(userScore);
  const valid = scores.filter(Number.isFinite);
  if (valid.length === 0) return null;
  let below = 0;
  let equal = 0;
  for (const s of valid) {
    if (s < userScore) below += 1;
    else if (s === userScore) equal += 1;
  }
  return ((below + equal / 2) / valid.length) * 100;
}

export interface BenchmarkOptions extends HistogramOptions {
  /** Minimum number of learners required before anything is shown. Default 30. */
  minSampleSize?: number;
}

export type BenchmarkResult =
  | {
      available: false;
      reason: 'insufficient_sample';
      sampleSize: number;
      minSampleSize: number;
    }
  | {
      available: true;
      sampleSize: number;
      minSampleSize: number;
      /** Rounded to a whole number, 0..100. */
      percentile: number;
      histogram: HistogramBin[];
      /** Index of the histogram bin containing the learner's score. */
      userBinIndex: number;
    };

export function computeBenchmark(
  scores: readonly number[],
  userScore: number,
  options: BenchmarkOptions = {},
): BenchmarkResult {
  assertScore(userScore);
  const minSampleSize = options.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
  if (!Number.isInteger(minSampleSize) || minSampleSize < 1) {
    throw new RangeError('`minSampleSize` must be a positive integer');
  }

  const valid = scores.filter(Number.isFinite);
  if (valid.length < minSampleSize) {
    return { available: false, reason: 'insufficient_sample', sampleSize: valid.length, minSampleSize };
  }

  const min = options.min ?? 0;
  const max = options.max ?? 100;
  const binCount = options.binCount ?? DEFAULT_BIN_COUNT;
  const histogram = buildHistogram(valid, { min, max, binCount });
  const percentile = Math.round(percentileRank(valid, userScore)!);

  return {
    available: true,
    sampleSize: valid.length,
    minSampleSize,
    percentile,
    histogram,
    userBinIndex: binIndex(clamp(userScore, min, max), min, max, binCount),
  };
}

function binIndex(score: number, min: number, max: number, binCount: number): number {
  if (score >= max) return binCount - 1;
  return Math.min(binCount - 1, Math.floor(((score - min) / (max - min)) * binCount));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function assertScore(score: number): void {
  if (!Number.isFinite(score)) throw new RangeError('`userScore` must be a finite number');
}
