import { Link } from 'wouter';
import type { ExamSummary } from '@workspace/api-client-react';
import { formatDuration } from '@/lib/format';
import { itemSummary } from './ExamFacts';

/** Side-by-side comparison. Exams arrive ordered by sortOrder: Primary, SBA, OSCE. */
export function ComparisonTable({ exams }: { exams: ExamSummary[] }) {
  const rows: [string, (e: ExamSummary) => string][] = [
    ['Exam type', (e) => e.examType],
    ['Format', (e) => e.format],
    ['Questions or stations', (e) => itemSummary(e) ?? '—'],
    ['Duration', (e) => (e.totalMinutes ? formatDuration(e.totalMinutes) : '—')],
    ['Break', (e) => (e.breakMinutes ? formatDuration(e.breakMinutes) : 'None scheduled')],
    ['Location', (e) => e.location ?? '—'],
  ];
  return (
    <div className="table-wrap" role="region" aria-labelledby="compare-heading" tabIndex={0}>
      <table className="data-table">
        <caption className="sr-only">Comparison of the exams</caption>
        <thead>
          <tr>
            <td className="sr-only">Feature</td>
            {exams.map((e) => <th key={e.id} scope="col"><Link href={`/exams/${e.slug}`}>{e.name}</Link></th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {exams.map((e) => <td key={e.id}>{value(e)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
