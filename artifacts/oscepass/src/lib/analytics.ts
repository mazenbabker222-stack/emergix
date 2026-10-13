import { getConsent } from './consent';

/**
 * Analytics are gated by consent: nothing loads unless the visitor chose "Accept all".
 * Provide the script URL with VITE_ANALYTICS_SRC (for example a PostHog or Plausible snippet).
 */
export function initAnalytics() {
  const src = import.meta.env.VITE_ANALYTICS_SRC as string | undefined;
  if (!src || getConsent() !== 'all') return;
  if (document.querySelector('script[data-analytics]')) return;
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  script.dataset.analytics = 'true';
  document.head.appendChild(script);
}
