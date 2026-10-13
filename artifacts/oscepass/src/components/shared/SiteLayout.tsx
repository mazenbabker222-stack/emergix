import type { ReactNode } from 'react';
import { useJsonLd, organizationJsonLd } from '@/lib/usePageMeta';
import { AnnouncementBanner } from './AnnouncementBanner';
import { CookieConsent } from './CookieConsent';
import { Footer } from './Footer';
import { Header } from './Header';

export function SiteLayout({ children }: { children: ReactNode }) {
  useJsonLd('organization', organizationJsonLd());
  return <>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <AnnouncementBanner />
    <Header />
    <div id="main-content" tabIndex={-1}>{children}</div>
    <Footer />
    <CookieConsent />
  </>;
}
