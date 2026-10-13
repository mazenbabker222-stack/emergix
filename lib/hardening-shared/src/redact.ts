/**
 * Log redaction: keeps secrets, signed URLs and answer keys out of logs and error reports.
 * Pure functions; safe to use in pino serializers and Sentry `beforeSend`.
 */

export const REDACTED = '[redacted]';

const SENSITIVE_QUERY_PARAMS = [
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'code',
  'signature',
  'sig',
  'key',
  'secret',
  'password',
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-security-token',
  'policy',
];

/** Object keys whose values are never logged (compared case-insensitively, ignoring _ and -). */
const SENSITIVE_KEYS = new Set(
  [
    'password',
    'newpassword',
    'currentpassword',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'secret',
    'apikey',
    'authorization',
    'cookie',
    'setcookie',
    'signedurl',
    'signature',
    'totp',
    'backupcode',
    'backupcodes',
    'correctanswer',
    'correctanswers',
    'correctoption',
    'correctoptionid',
    'answerkey',
    'iscorrect',
  ].map((k) => k.toLowerCase()),
);

const normaliseKey = (key: string) => key.replace(/[_\-\s]/g, '').toLowerCase();
export const isSensitiveKey = (key: string): boolean => SENSITIVE_KEYS.has(normaliseKey(key));

/** Path segments after these prefixes carry one-time tokens. */
const TOKEN_PATH_PREFIXES = /(\/(?:reset-password|verify-email|verify|invite|unsubscribe)\/)[^/?#\s]+/gi;

export function redactUrl(url: string): string {
  const qIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');
  const end = hashIndex === -1 ? url.length : hashIndex;
  const path = url.slice(0, qIndex === -1 || qIndex > end ? end : qIndex).replace(TOKEN_PATH_PREFIXES, `$1${REDACTED}`);
  if (qIndex === -1 || qIndex > end) return path; // fragments are never logged
  const query = url
    .slice(qIndex + 1, end)
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      const name = eq === -1 ? pair : pair.slice(0, eq);
      let decoded = name;
      try {
        decoded = decodeURIComponent(name);
      } catch {
        /* keep raw name */
      }
      return eq !== -1 && SENSITIVE_QUERY_PARAMS.includes(decoded.toLowerCase()) ? `${name}=${REDACTED}` : pair;
    })
    .join('&');
  return query ? `${path}?${query}` : path;
}

const JWT_RE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const URL_RE = /https?:\/\/[^\s"'<>)]+/gi;

/** Scrubs secrets that appear inside free text (error messages, stack traces). */
export function redactString(text: string): string {
  return text
    .replace(URL_RE, (u) => redactUrl(u))
    .replace(BEARER_RE, (_m, scheme: string) => `${scheme} ${REDACTED}`)
    .replace(JWT_RE, REDACTED);
}

export interface RedactOptions {
  maxDepth?: number;
}

/** Deep-copies `value`, replacing sensitive keys and scrubbing strings. Handles cycles. */
export function redactObject(value: unknown, options: RedactOptions = {}): unknown {
  const maxDepth = options.maxDepth ?? 8;
  const seen = new WeakSet<object>();

  const walk = (v: unknown, depth: number): unknown => {
    if (typeof v === 'string') return redactString(v);
    if (v === null || typeof v !== 'object') return v;
    if (v instanceof Date) return v;
    if (seen.has(v)) return '[circular]';
    if (depth >= maxDepth) return '[truncated]';
    seen.add(v);

    if (v instanceof Error) {
      return { name: v.name, message: redactString(v.message), stack: v.stack ? redactString(v.stack) : undefined };
    }
    if (Array.isArray(v)) return v.map((item) => walk(item, depth + 1));

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : walk(val, depth + 1);
    }
    return out;
  };

  return walk(value, 0);
}

/** Paths for pino's built-in `redact` option (belt and braces alongside serializers). */
export const PINO_REDACT_PATHS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.token',
  '*.secret',
  '*.signedUrl',
  '*.correctAnswer',
  '*.correctAnswers',
  '*.answerKey',
];
