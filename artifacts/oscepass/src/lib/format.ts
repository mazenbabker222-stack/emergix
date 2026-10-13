const UTC_DATE = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

/** "12 Apr 2027". Dates are calendar dates, so format them in UTC to avoid timezone shifts. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(UTC_DATE(iso));
}

/** "12–14 Apr 2027", "30 Apr – 2 May 2027" or a single date. */
export function formatDateRange(start: string, end?: string | null): string {
  if (!end || end === start) return formatDate(start);
  const a = UTC_DATE(start);
  const b = UTC_DATE(end);
  if (a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()) {
    const month = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(b);
    return `${a.getUTCDate()}–${b.getUTCDate()} ${month}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatMoney(amountMinor: number, currency = 'GBP'): string {
  if (amountMinor === 0) return 'Free';
  const major = amountMinor / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
  }).format(major);
}

/** 180 -> "3 hours", 162 -> "2 h 42 min", 60 -> "1 hour", 45 -> "45 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  return `${h} h ${m} min`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Long date for "last updated" notes: "5 October 2026". */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}
