import { useMemo, useState } from 'react';
import { CalendarPlus, ExternalLink } from 'lucide-react';
import { useListExamDates, useListExams } from '@workspace/api-client-react';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { PageHero } from '@/components/shared/PageHero';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { brand } from '@/config/brand';
import { DatesTable, downloadAll } from '@/features/exams/DatesTable';
import { formatLongDate } from '@/lib/format';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Calendar() {
  usePageMeta('Exam calendar and fees', `MRCEM exam dates and fees in one table, with calendar export. Always confirm on the official site.`);
  const [exam, setExam] = useState('');
  const exams = useListExams();
  const dates = useListExamDates(exam ? { exam } : undefined);
  const items = useMemo(() => dates.data?.items ?? [], [dates.data]);
  return <SiteLayout><main>
    <PageHero eyebrow="Calendar" title="Exam dates and fees." intro="Plan your preparation backwards from the sitting you are aiming for." />
    <section className="section"><div className="container">
      <div className="catalog-controls">
        <label className="calendar-filter">
          <span>Filter by exam</span>
          <select className="filter-select" value={exam} onChange={(e) => setExam(e.target.value)} data-testid="select-exam">
            <option value="">All exams</option>
            {exams.data?.items.map((e) => <option key={e.id} value={e.slug}>{e.name}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-light" disabled={items.length === 0} onClick={() => downloadAll(items)}><CalendarPlus size={16} aria-hidden="true" />Add all to calendar (.ics)</button>
      </div>
      <p className="note-inline" aria-live="polite">{items.length} {items.length === 1 ? 'sitting' : 'sittings'} shown</p>
      {dates.isLoading && <PageSkeleton rows={3} label="Loading dates" />}
      {dates.isError && <ErrorState onRetry={() => void dates.refetch()} />}
      {dates.data && items.length === 0 && <EmptyState title="No dates to show" text="Try another exam, or check the official site." />}
      {items.length > 0 && <DatesTable dates={items} />}
      <div className="note-panel">
        {dates.data?.lastUpdated && <p>Last updated {formatLongDate(dates.data.lastUpdated)}.</p>}
        <p>Dates and fees can change. Confirm them on the <a href="https://rcem.ac.uk/" target="_blank" rel="noopener noreferrer">official college website<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a> before you book.</p>
        <p className="disclaimer">{brand.legalDisclaimer}</p>
      </div>
    </div></section>
  </main></SiteLayout>;
}
