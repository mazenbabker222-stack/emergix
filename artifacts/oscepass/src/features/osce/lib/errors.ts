/** Friendly message from an API error (shape: { error: { code, message } }). */
export function apiMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (err as { data?: { error?: { message?: unknown } } } | null)?.data;
  const message = data?.error?.message;
  return typeof message === 'string' && message ? message : fallback;
}

export function apiCode(err: unknown): string | undefined {
  const code = (err as { data?: { error?: { code?: unknown } } } | null)?.data?.error?.code;
  return typeof code === 'string' ? code : undefined;
}
