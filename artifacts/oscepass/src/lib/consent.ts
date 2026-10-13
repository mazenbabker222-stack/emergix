import { useSyncExternalStore } from 'react';
import { safeGet, safeSet } from './safeStorage';

export type Consent = 'all' | 'essential';

export const CONSENT_KEY = 'emergix-academy:cookie-consent';
const CHANGE_EVENT = 'emergix-academy:consent-change';
const OPEN_EVENT = 'emergix-academy:consent-open';

export function getConsent(): Consent | null {
  const value = safeGet(CONSENT_KEY);
  return value === 'all' || value === 'essential' ? value : null;
}

export function setConsent(value: Consent) {
  safeSet(CONSENT_KEY, value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Footer "Cookie settings" link: show the banner again. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenCookieSettings(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, getConsent, () => null);
}
