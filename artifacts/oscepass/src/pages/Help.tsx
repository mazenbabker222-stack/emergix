import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'wouter';
import { useListFaqs } from '@workspace/api-client-react';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { PageHero } from '@/components/shared/PageHero';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { FaqAccordion } from '@/features/exams/FaqAccordion';
import { faqPageJsonLd } from '@/lib/schema';
import { useJsonLd, usePageMeta } from '@/lib/usePageMeta';

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function Help() {
  usePageMeta('Help Centre', 'Answers to common questions about the exams, accounts, pricing and support.');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 250);
  const { data, isLoading, isError, refetch } = useListFaqs(q ? { q } : undefined);
  const ld = useMemo(() => (!q && data?.items.length ? faqPageJsonLd(data.items) : null), [q, data]);
  useJsonLd('faq', ld);
  return <SiteLayout><main>
    <PageHero eyebrow="Help Centre" title="How can we help?" intro="Search the questions other candidates ask most." />
    <section className="section"><div className="container faq-wrap">
      <label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Search help</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" data-testid="input-help-search" /></label>
      <p className="note-inline" aria-live="polite">{data ? `${data.items.length} ${data.items.length === 1 ? 'answer' : 'answers'}` : ''}</p>
      {isLoading && <PageSkeleton rows={3} label="Loading questions" />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {data && data.items.length === 0 && <EmptyState title="No answers match that search" text="Try different words, or ask us directly." />}
      {data && data.items.length > 0 && <FaqAccordion key={q} faqs={data.items} />}
      <p className="help-contact">Still stuck? <Link href="/contact">Contact the team</Link>.</p>
    </div></section>
  </main></SiteLayout>;
}
