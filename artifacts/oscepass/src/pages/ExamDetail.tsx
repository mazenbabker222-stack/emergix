import { useMemo } from 'react';
import { ArrowRight, Download, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { ApiError, useGetExam } from '@workspace/api-client-react';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { PageHero } from '@/components/shared/PageHero';
import { Prose } from '@/components/shared/Prose';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { brand } from '@/config/brand';
import { DatesTable } from '@/features/exams/DatesTable';
import { ExamFacts } from '@/features/exams/ExamFacts';
import { FaqAccordion } from '@/features/exams/FaqAccordion';
import { formatBytes, formatDuration, formatLongDate } from '@/lib/format';
import { courseJsonLd, faqPageJsonLd } from '@/lib/schema';
import { useJsonLd, usePageMeta } from '@/lib/usePageMeta';
import NotFound from './not-found';

export default function ExamDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: exam, isLoading, error, refetch } = useGetExam(slug);
  const notFound = error instanceof ApiError && error.status === 404;

  usePageMeta(
    exam ? exam.name : 'Exam',
    exam ? `${exam.name}: ${exam.format}. Dates, fees, FAQs and preparation with ${brand.name}.` : `Exam information on ${brand.name}.`,
    { noindex: notFound },
  );
  const faqLd = useMemo(() => (exam && exam.faqs.length ? faqPageJsonLd(exam.faqs) : null), [exam]);
  const courseLd = useMemo(() => (exam ? courseJsonLd({ name: `${exam.name} preparation`, description: exam.summary, path: `/exams/${exam.slug}` }) : null), [exam]);
  useJsonLd('faq', faqLd);
  useJsonLd('course', courseLd);

  if (notFound) return <NotFound />;
  return <SiteLayout><main>
    {isLoading && <PageSkeleton label="Loading exam" />}
    {error && !notFound && <div className="container section"><ErrorState onRetry={() => void refetch()} /></div>}
    {exam && <>
      <PageHero eyebrow={exam.examType} title={exam.name} intro={exam.summary} />
      <section className="section" aria-labelledby="overview-heading"><div className="container exam-layout">
        <div>
          <h2 id="overview-heading">At a glance</h2>
          <ExamFacts exam={exam} />
          {exam.sections.length > 0 && <>
            <h2>Structure</h2>
            <div className="table-wrap" role="region" aria-label="Exam structure" tabIndex={0}>
              <table className="data-table">
                <thead><tr><th scope="col">Part</th><th scope="col">Items</th><th scope="col">Time</th><th scope="col">Notes</th></tr></thead>
                <tbody>{exam.sections.map((s) => <tr key={s.name}>
                  <th scope="row">{s.name}</th>
                  <td>{s.itemCount ? `${s.itemCount} ${s.itemLabel}` : s.itemLabel}</td>
                  <td>{s.minutes ? formatDuration(s.minutes) : '—'}</td>
                  <td>{s.notes ?? '—'}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </>}
          <Prose text={exam.content} className="exam-content" />
        </div>
        <aside className="exam-aside" aria-label="Next steps">
          <h2>Prepare with {brand.shortName}</h2>
          <Link className="btn btn-primary" href="/free-demo">Try the free demo <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link className="btn btn-light" href="/pricing">See plans</Link>
          {exam.officialUrl && <a className="btn btn-light" href={exam.officialUrl} target="_blank" rel="noopener noreferrer">Official exam information <ExternalLink size={15} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>}
          {exam.lastReviewedAt && <p className="muted">Last reviewed {formatLongDate(exam.lastReviewedAt)}</p>}
        </aside>
      </div></section>

      {exam.dates.length > 0 && <section className="section compare-section" aria-labelledby="dates-heading"><div className="container">
        <div className="section-heading"><h2 id="dates-heading">Dates and fees</h2><p>Sample values until confirmed. See the <Link href="/calendar">full calendar</Link> and check the official site.</p></div>
        <DatesTable dates={exam.dates} showExam={false} />
      </div></section>}

      {exam.documents.length > 0 && <section className="section" aria-labelledby="docs-heading"><div className="container">
        <div className="section-heading"><h2 id="docs-heading">Documents</h2></div>
        <ul className="doc-list">{exam.documents.map((d) => <li key={d.id}>
          <a href={d.url} target="_blank" rel="noopener noreferrer"><Download size={18} aria-hidden="true" /><span><strong>{d.title}</strong>{d.description && <small>{d.description}</small>}</span>
            <span className="doc-meta">{d.fileType.toUpperCase()}{d.sizeBytes ? ` · ${formatBytes(d.sizeBytes)}` : ''}</span><span className="sr-only"> (opens in a new tab)</span></a>
        </li>)}</ul>
      </div></section>}

      {exam.faqs.length > 0 ? <section className="section compare-section" aria-labelledby="faq-heading"><div className="container faq-wrap">
        <div className="section-heading"><span className="eyebrow">Frequently asked questions</span><h2 id="faq-heading">About the {exam.shortName} exam</h2></div>
        <FaqAccordion faqs={exam.faqs} defaultOpenFirst />
      </div></section> : <div className="container section"><EmptyState title="No questions answered yet" /></div>}

      <section className="section"><div className="container note-panel">
        <p className="disclaimer">{brand.legalDisclaimer}</p>
      </div></section>
    </>}
  </main></SiteLayout>;
}
