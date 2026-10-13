import { ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { useListExams } from '@workspace/api-client-react';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { PageHero } from '@/components/shared/PageHero';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { brand } from '@/config/brand';
import { ComparisonTable } from '@/features/exams/ComparisonTable';
import { ExamFacts } from '@/features/exams/ExamFacts';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Exams() {
  usePageMeta('MRCEM exams', `Compare the MRCEM Primary, SBA and OSCE exams: format, length, structure and how to prepare with ${brand.name}.`);
  const { data, isLoading, isError, refetch } = useListExams();
  return <SiteLayout><main>
    <PageHero eyebrow="Exams" title="Choose your exam." intro="Everything you need to know about the MRCEM Primary, SBA and OSCE exams, in one place." />
    {isLoading && <PageSkeleton label="Loading exams" />}
    {isError && <div className="container section"><ErrorState onRetry={() => void refetch()} /></div>}
    {data && data.items.length === 0 && <div className="container section"><EmptyState title="No exams are published yet" text="Please check back soon." /></div>}
    {data && data.items.length > 0 && <>
      <section className="section" aria-labelledby="exam-list-heading"><div className="container">
        <h2 id="exam-list-heading" className="sr-only">Exams</h2>
        <div className="exam-grid">
          {data.items.map((exam) => <article key={exam.id} className="exam-card">
            <span className="eyebrow">{exam.examType}</span>
            <h3><Link href={`/exams/${exam.slug}`}>{exam.name}</Link></h3>
            <p>{exam.summary}</p>
            <ExamFacts exam={exam} />
            <Link className="btn btn-primary" href={`/exams/${exam.slug}`}>View {exam.shortName} exam <ArrowRight size={16} aria-hidden="true" /></Link>
          </article>)}
        </div>
      </div></section>
      <section className="section compare-section" id="compare" aria-labelledby="compare-heading"><div className="container">
        <div className="section-heading"><span className="eyebrow">Side by side</span><h2 id="compare-heading">Compare the exams</h2><p>Primary, then SBA, then OSCE: the usual order candidates sit them.</p></div>
        <ComparisonTable exams={data.items} />
      </div></section>
      <section className="section"><div className="container note-panel">
        <p>Exam details change. Always confirm requirements, dates and fees with the <a href="https://rcem.ac.uk/" target="_blank" rel="noopener noreferrer">official college website<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>.</p>
        <p className="disclaimer">{brand.legalDisclaimer}</p>
      </div></section>
    </>}
  </main></SiteLayout>;
}
