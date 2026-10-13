import type { ExamSummary } from '@workspace/api-client-react';
import { formatDuration } from '@/lib/format';

/** Primary count shown for an exam: total questions, or the first section's item count (e.g. 16 stations). */
export function itemSummary(exam: Pick<ExamSummary, 'totalQuestions'> & { sections?: { itemCount: number | null; itemLabel: string }[] }) {
  if (exam.totalQuestions) return `${exam.totalQuestions} questions`;
  const first = exam.sections?.find((s) => s.itemCount);
  return first ? `${first.itemCount} ${first.itemLabel}` : null;
}

export function ExamFacts({ exam }: { exam: ExamSummary & { sections?: { itemCount: number | null; itemLabel: string }[] } }) {
  const facts: [string, string | null][] = [
    ['Exam type', exam.examType],
    ['Format', exam.format],
    ['Questions or stations', itemSummary(exam)],
    ['Duration', exam.totalMinutes ? formatDuration(exam.totalMinutes) : null],
    ['Break', exam.breakMinutes ? formatDuration(exam.breakMinutes) : null],
    ['Location', exam.location],
  ];
  return (
    <dl className="facts">
      {facts.filter(([, value]) => value).map(([term, value]) => (
        <div key={term}><dt>{term}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}
