import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { brand } from '@/config/brand';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let node = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

export interface PageMetaOptions {
  /** Canonical path without the base path. Defaults to the current route. */
  path?: string;
  /** Absolute or site-relative social image. */
  image?: string;
  /** "article" for blog posts. */
  type?: 'website' | 'article';
  /** Keeps a page out of search results (account pages, 404s). */
  noindex?: boolean;
}

const basePath = () => import.meta.env.BASE_URL.replace(/\/$/, '');

export function absoluteUrl(path: string): string {
  return `${brand.siteUrl}${basePath()}${path === '/' ? '' : path}`;
}

export function usePageMeta(title: string, description: string, options: PageMetaOptions = {}) {
  const [location] = useLocation();
  const { path = location, image = '/brand/hero.jpg', type = 'website', noindex = false } = options;
  useEffect(() => {
    const fullTitle = `${title} | ${brand.name}`;
    const canonical = absoluteUrl(path.split(/[?#]/)[0] || '/');
    const imageUrl = /^https?:\/\//.test(image) ? image : `${brand.siteUrl}${basePath()}${image}`;
    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow');
    upsertLink('canonical', canonical);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', brand.name);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
  }, [title, description, path, image, type, noindex]);
}

/** Injects a JSON-LD block into <head> while the component is mounted. `id` keeps blocks distinct. */
export function useJsonLd(id: string, data: Record<string, unknown> | null) {
  const json = data ? JSON.stringify(data) : null;
  useEffect(() => {
    if (!json) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.jsonld = id;
    script.text = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [id, json]);
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: brand.siteUrl,
    logo: `${brand.siteUrl}/brand/wordmark.svg`,
    description: brand.description,
    ...(brand.supportEmail ? { email: brand.supportEmail } : {}),
    sameAs: Object.values(brand.social).filter(Boolean),
  };
}
