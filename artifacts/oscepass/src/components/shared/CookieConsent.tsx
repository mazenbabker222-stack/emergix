import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { initAnalytics } from '@/lib/analytics';
import { onOpenCookieSettings, setConsent, useConsent } from '@/lib/consent';

/** Cookie banner. Analytics stay off until the visitor chooses "Accept all". Renders only after mount. */
export function CookieConsent() {
  const consent = useConsent();
  const [mounted, setMounted] = useState(false);
  const [reopened, setReopened] = useState(false);
  useEffect(() => {
    setMounted(true);
    return onOpenCookieSettings(() => setReopened(true));
  }, []);
  useEffect(() => {
    initAnalytics();
  }, [consent]);
  if (!mounted || (consent !== null && !reopened)) return null;

  function choose(value: 'all' | 'essential') {
    setConsent(value);
    setReopened(false);
  }

  return (
    <section className="cookie-banner" aria-label="Cookie consent" data-testid="cookie-banner">
      <p>
        We use essential storage to make the site work. With your permission we also use analytics to improve it.{' '}
        <Link href="/legal/cookies">Read the cookie policy</Link>.
      </p>
      <div className="cookie-actions">
        <button type="button" className="btn btn-light" onClick={() => choose('essential')}>Essential only</button>
        <button type="button" className="btn btn-primary" onClick={() => choose('all')}>Accept all</button>
      </div>
    </section>
  );
}
