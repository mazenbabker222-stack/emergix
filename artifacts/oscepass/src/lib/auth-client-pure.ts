// Pure helpers (no browser globals) so they can be unit-tested in Node.

/** Only allow same-site relative redirects (prevents open redirects through ?next=). */
export function safeNext(value: string | null | undefined, fallback = '/app'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
