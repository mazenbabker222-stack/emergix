import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export { safeNext } from './auth-client-pure';

/** Talks to Better Auth on the same origin under /api/auth (cookies are httpOnly, set by the server). */
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [twoFactorClient()],
});

/** Absolute URL of a SPA route (respects the Vite base path); used in e-mail callback links. */
export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${base}${path}`;
}

export function authErrorMessage(error: { status?: number; message?: string } | null | undefined): string {
  if (!error) return '';
  if (error.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  if (error.status === 403) {
    const message = error.message?.toLowerCase() ?? '';
    if (message.includes('origin') || message.includes('trusted')) {
      return 'This sign-in request came from an untrusted app address. Open the current app URL and try again.';
    }
    if (message.includes('email') || message.includes('e-mail') || message.includes('verif')) {
      return 'Please confirm your e-mail address first. Check your inbox for the link.';
    }
    return error.message || 'This sign-in request was blocked. Please try again from the current app URL.';
  }
  if (error.status === 401) return 'Invalid e-mail or password.';
  return error.message || 'Something went wrong. Please try again.';
}
