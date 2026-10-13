import { CalendarPlus } from 'lucide-react';
import { Link } from 'wouter';
import type { PublicExamDate } from '@workspace/api-client-react';
import { brand } from '@/config/brand';
import { formatDate, formatDateRange, formatMoney } from '@/lib/format';
import { buildIcs, downloadIcs, type IcsEvent } from '@/lib/ics';
import { absoluteUrl } from '@/lib/usePageMeta';
import { PlaceholderBadge } from './PlaceholderBadge';

export function toIcsEvent(d: PublicExamDate): IcsEvent {
  return {
    uid: `${d.id}@${brand.domain}`,
    title: `${d.examName}: ${d.label}`,
    startDate: d.startDate,
    endDate: d.endDate,
    location: d.location,
    url: absoluteUrl('/calendar'),
    description: [
      d.isPlaceholder ? 'PLACEHOLDER date: confirm on the official college website before relying on it.' : 'Confirm details on the official college website.',
      d.applicationCloses ? `Applications close ${formatDate(d.applicationCloses)}.` : '',
    ].filter(Boolean).join(' '),
  };
}

export function downloadAll(dates: PublicExamDate[], filename = 'exam-dates.ics') {
  downloadIcs(filename, buildIcs(dates.map(toIcsEvent), { prodId: `-//${brand.name}//Exam calendar//EN` }));
}

export function DatesTable({ dates, showExam = true }: { dates: PublicExamDate[]; showExam?: boolean }) {
  return (
    <div className="table-wrap" role="region" aria-label="Exam dates and fees" tabIndex={0}>
      <table className="data-table dates-table">
        <thead>
          <tr>
            {showExam && <th scope="col">Exam</th>}
            <th scope="col">Sitting</th>
            <th scope="col">Date</th>
            <th scope="col">Application window</th>
            <th scope="col">Fee</th>
            <th scope="col"><span className="sr-only">Add to calendar</span></th>
          </tr>
        </thead>
        <tbody>
          {dates.map((d) => (
            <tr key={d.id}>
              {showExam && <th scope="row"><Link href={`/exams/${d.examSlug}`}>{d.examName}</Link></th>}
              <td>{d.label}</td>
              <td>{formatDateRange(d.startDate, d.endDate)}{d.location && <small className="cell-note">{d.location}</small>}</td>
              <td>{d.applicationOpens && d.applicationCloses ? `${formatDate(d.applicationOpens)} – ${formatDate(d.applicationCloses)}` : '—'}</td>
              <td>{d.feeMinor === null ? '—' : formatMoney(d.feeMinor, d.feeCurrency)} {d.isPlaceholder && <PlaceholderBadge />}</td>
              <td>
                <button type="button" className="btn btn-light btn-small" onClick={() => downloadAll([d], `${d.examSlug}-${d.startDate}.ics`)} aria-label={`Add ${d.examName}, ${d.label}, to your calendar`}>
                  <CalendarPlus size={15} aria-hidden="true" />Add to calendar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
