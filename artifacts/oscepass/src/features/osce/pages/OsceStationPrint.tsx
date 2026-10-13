import { Link, useParams, useSearch } from 'wouter';
import { useGetOsceStation } from '@workspace/api-client-react';
import { GLOBAL_RATINGS } from '@workspace/osce-core';
import { Skeleton } from '@/components/ui/skeleton';
import { brand } from '@/config/brand';
import { usePageMeta } from '@/lib/usePageMeta';
import NotFound from '@/pages/not-found';
import { Blocks, Rich } from '../components/Rich';
import '../osce.css';

/**
 * Printable sheets. Use the browser's Print dialog and choose "Save as PDF" for a PDF.
 * `?sheet=candidate` (default) is the candidate sheet; `?sheet=examiner` the examiner sheet.
 */
export default function OsceStationPrint() {
  const { slug = '' } = useParams<{ slug: string }>();
  const sheet = new URLSearchParams(useSearch()).get('sheet') === 'examiner' ? 'examiner' : 'candidate';
  const q = useGetOsceStation(slug);
  usePageMeta(q.data ? `${q.data.title}: ${sheet} sheet` : 'Station sheet', 'Printable OSCE station sheet.');
  if (q.isError) return <NotFound />;
  if (!q.data) return <div className="osce-print"><Skeleton className="h-64 w-full" /></div>;
  const s = q.data;
  const c = s.content;
  return (
    <div className="osce-print">
      <div className="osce-print-toolbar no-print">
        <Link href={`/app/osce/${s.slug}`}>← Back to the station</Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} data-testid="print-now">Print or save as PDF</button>
      </div>
      <h1>{s.title}: {sheet === 'examiner' ? 'examiner sheet' : 'candidate sheet'}</h1>
      <p>{s.topicGroup} · {Math.round(s.timing.readingSeconds / 60)} min reading · {Math.round(s.timing.historySeconds / 60)} min station · {Math.round(s.timing.examinerSeconds / 60)} min examiner questions · {s.totalMarks} marks</p>

      <h2>Candidate instructions</h2><Blocks blocks={c.candidateInstructions} />
      {sheet === 'candidate' && c.examinerQuestionPrompts.length > 0 && <><h2>Examiner questions</h2><Blocks blocks={c.examinerQuestionPrompts.filter((b) => !b.muted)} /></>}

      {sheet === 'examiner' && (
        <>
          <h2>Marking sheet</h2>
          <table className="osce-table"><thead><tr><th scope="col">Domain</th><th scope="col">Expected behaviour</th><th scope="col">Max</th><th scope="col">Mark</th></tr></thead>
            <tbody>{s.domains.map((d) => <tr key={d.id}><th scope="row">{d.domain}</th><td>{d.descriptor}</td><td>{d.maxMarks}</td><td className="osce-box" /></tr>)}
              <tr><th scope="row" colSpan={2}>Total</th><td>{s.totalMarks}</td><td className="osce-box" /></tr></tbody></table>
          <p>Global rating: {GLOBAL_RATINGS.map((r) => <span key={r} className="osce-tick">☐ {r}</span>)}</p>
          {c.globalRatingGuide.length > 0 && <Blocks blocks={c.globalRatingGuide} />}
          {c.actorBriefs.map((b, i) => <section key={i}><h2>{b.title}</h2><Blocks blocks={b.blocks} /></section>)}
          {c.examinerExpectations.length > 0 && <><h2>What the examiner expects</h2><Blocks blocks={c.examinerExpectations} /></>}
          {c.ifThisHappens.length > 0 && <><h2>If this happens, react like this</h2><Blocks blocks={c.ifThisHappens} /></>}
          {c.patientQuestions.length > 0 && <><h2>Answering patient and relative questions</h2><Blocks blocks={c.patientQuestions} /></>}
          <h2>Examiner questions with model answers</h2>
          <ol>{c.examinerQuestions.map((qa, i) => <li key={i}><strong><Rich text={qa.question} /></strong><Blocks blocks={qa.answer} /></li>)}</ol>
          {c.redFlags.length > 0 && <><h2>Red flags for examiners</h2><Blocks blocks={c.redFlags} /></>}
        </>
      )}
      <p className="osce-muted">Fictional teaching case for exam practice. {brand.legalDisclaimer}</p>
    </div>
  );
}
