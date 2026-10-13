import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, fold } from './ics';

const now = new Date('2026-10-12T10:00:00Z');

describe('ics', () => {
  it('builds an all-day event with an exclusive DTEND', () => {
    const ics = buildIcs([{ uid: 'a@x', title: 'OSCE: Circuit', startDate: '2027-04-12', endDate: '2027-04-14' }], { prodId: '-//T//EN', now });
    expect(ics).toContain('DTSTART;VALUE=DATE:20270412');
    expect(ics).toContain('DTEND;VALUE=DATE:20270415');
    expect(ics).toContain('DTSTAMP:20261012T100000Z');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('uses the next day as DTEND for a single-day event, across month ends', () => {
    const ics = buildIcs([{ uid: 'b@x', title: 'Primary', startDate: '2027-01-31' }], { prodId: 'p', now });
    expect(ics).toContain('DTEND;VALUE=DATE:20270201');
  });
  it('escapes special characters and folds long lines', () => {
    expect(escapeText('a,b;c\nd')).toBe('a\\,b\\;c\\nd');
    const folded = fold('DESCRIPTION:' + 'x'.repeat(200));
    for (const line of folded.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
