/**
 * OSCE marking helpers. Pure functions, no I/O: shared by the API server (authoritative
 * validation) and the web app (live totals).
 */

export const GLOBAL_RATINGS = ['Clear pass', 'Pass', 'Borderline', 'Fail'] as const;
export type GlobalRating = (typeof GLOBAL_RATINGS)[number];

export function isGlobalRating(value: unknown): value is GlobalRating {
  return typeof value === 'string' && (GLOBAL_RATINGS as readonly string[]).includes(value);
}

export interface MarkingDomain {
  id: string;
  maxMarks: number;
}

/** Map of domain id -> awarded mark. */
export type Marks = Record<string, number>;

export function maxTotal(domains: readonly MarkingDomain[]): number {
  return domains.reduce((sum, d) => sum + d.maxMarks, 0);
}

/** Sum of awarded marks. Unknown domains are ignored and each mark is clamped to 0..max. */
export function sumMarks(domains: readonly MarkingDomain[], marks: Marks): number {
  return domains.reduce((sum, d) => sum + clampMark(marks[d.id], d.maxMarks), 0);
}

export function clampMark(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), max);
}

export interface MarksValidation {
  ok: boolean;
  errors: string[];
  /** Cleaned marks (only known domains, integers within range). Safe to persist when ok. */
  marks: Marks;
  total: number;
  maxTotal: number;
}

/**
 * Strict validation for marks submitted to the server: every key must be a known domain and
 * every value an integer between 0 and that domain's maximum. Missing domains are allowed
 * (unmarked = 0) so partially marked sheets can be autosaved.
 */
export function validateMarks(domains: readonly MarkingDomain[], input: Record<string, unknown>): MarksValidation {
  const errors: string[] = [];
  const byId = new Map(domains.map((d) => [d.id, d]));
  const marks: Marks = {};
  for (const [key, value] of Object.entries(input)) {
    const domain = byId.get(key);
    if (!domain) {
      errors.push(`Unknown marking domain: ${key}`);
      continue;
    }
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      errors.push(`Mark for ${key} must be a whole number`);
      continue;
    }
    if (value < 0 || value > domain.maxMarks) {
      errors.push(`Mark for ${key} must be between 0 and ${domain.maxMarks}`);
      continue;
    }
    marks[key] = value;
  }
  return { ok: errors.length === 0, errors, marks, total: sumMarks(domains, marks), maxTotal: maxTotal(domains) };
}

export function percentage(total: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((total / max) * 1000) / 10;
}

export interface DomainScore {
  domain: string;
  awarded: number;
  max: number;
}

/** Aggregate per-domain scores (by domain name) across several stations, for circuit reports. */
export function aggregateByDomainName(
  items: readonly { domains: readonly { name: string; maxMarks: number; mark: number }[] }[],
): DomainScore[] {
  const map = new Map<string, DomainScore>();
  for (const item of items) {
    for (const d of item.domains) {
      const entry = map.get(d.name) ?? { domain: d.name, awarded: 0, max: 0 };
      entry.awarded += d.mark;
      entry.max += d.maxMarks;
      map.set(d.name, entry);
    }
  }
  return [...map.values()].sort((a, b) => a.domain.localeCompare(b.domain, 'en-GB'));
}
