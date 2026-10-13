import { describe, expect, it } from 'vitest';
import { formatDateRange, formatDuration, formatMoney } from './format';

describe('format', () => {
  it('formats durations', () => {
    expect(formatDuration(180)).toBe('3 hours');
    expect(formatDuration(60)).toBe('1 hour');
    expect(formatDuration(162)).toBe('2 h 42 min');
    expect(formatDuration(45)).toBe('45 min');
  });
  it('formats date ranges without timezone drift', () => {
    expect(formatDateRange('2027-04-12', '2027-04-14')).toBe('12–14 Apr 2027');
    expect(formatDateRange('2027-04-30', '2027-05-02')).toBe('30 Apr 2027 – 2 May 2027');
    expect(formatDateRange('2027-02-10')).toBe('10 Feb 2027');
  });
  it('formats money from minor units', () => {
    expect(formatMoney(0)).toBe('Free');
    expect(formatMoney(1900)).toBe('£19');
    expect(formatMoney(1950)).toBe('£19.50');
  });
});
