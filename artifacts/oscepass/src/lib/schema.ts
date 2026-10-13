import { brand } from '@/config/brand';
import { absoluteUrl } from './usePageMeta';
import { stripMarkdown } from './prose';

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: stripMarkdown(f.answer) },
    })),
  };
}

export function courseJsonLd(course: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    url: absoluteUrl(course.path),
    provider: { '@type': 'Organization', name: brand.name, sameAs: brand.siteUrl },
  };
}

export function articleJsonLd(post: { title: string; description: string; path: string; author: string; publishedAt: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: absoluteUrl(post.path),
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: brand.name },
  };
}
