/**
 * Single source of truth for the product brand.
 * Never hard-code the brand name anywhere else: import `brand` instead.
 * (index.html receives these values through the Vite plugin in vite.config.ts.)
 */
const name = 'Emergix Academy';
// Replace with the verified production domain before launch.
const domain = 'emergix-academy.example';

export const brand = {
  name,
  /** Name split for the two-tone wordmark. */
  nameParts: name.split(' ') as readonly string[],
  shortName: 'Emergix',
  tagline: 'Clinical learning, made clear',
  description:
    'Prepare for A&E and MRCEM exams with realistic cases, expert guidance, clinical resources and focused practice.',
  domain,
  /**
   * Public origin used for canonical URLs, Open Graph and JSON-LD.
   * Set VITE_SITE_URL in production; the placeholder domain is used until then.
   */
  siteUrl: (
    (import.meta.env?.VITE_SITE_URL as string | undefined) ??
    (typeof window === 'undefined' ? `https://${domain}` : window.location.origin)
  ).replace(/\/$/, ''),
  supportEmail: '',
  address: '',
  phone: '0563169123',
  /** TODO(owner): add real profile URLs; empty strings are not rendered. */
  social: {
    x: '',
    linkedin: '',
    youtube: '',
    instagram: '',
  },
  themeColor: '#173d32',
  legalDisclaimer:
    'Not affiliated with or endorsed by the Royal College of Emergency Medicine.',
} as const;

export type Brand = typeof brand;
