import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useGetPage } from '@workspace/api-client-react';
import { ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { PageHero } from '@/components/shared/PageHero';
import { Prose } from '@/components/shared/Prose';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { usePageMeta } from '@/lib/usePageMeta';

interface DemoOption { key: string; text: string; rationale: string }
interface DemoQuestion { id: string; stem: string; options: DemoOption[]; correct: string; keyPoint: string }
interface DemoData { questions: DemoQuestion[]; lesson?: { title: string; body: string } }

/** Defensive read of the CMS JSON: the admin editor can store anything, so never trust its shape. */
export function parseDemo(data: unknown): DemoData {
  const d = (data ?? {}) as { questions?: unknown; lesson?: { title?: unknown; body?: unknown } };
  const questions = (Array.isArray(d.questions) ? d.questions : []).filter((q): q is DemoQuestion =>
    !!q && typeof q.id === 'string' && typeof q.stem === 'string' && Array.isArray(q.options) && typeof q.correct === 'string');
  const lesson = typeof d.lesson?.title === 'string' && typeof d.lesson?.body === 'string' ? { title: d.lesson.title, body: d.lesson.body } : undefined;
  return { questions, lesson };
}

function Question({ q, index, onAnswer }: { q: DemoQuestion; index: number; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  return <article className="qd-card" aria-labelledby={`${q.id}-stem`}>
    <p className="qd-meta">Question {index + 1} · SAMPLE</p>
    <h3 id={`${q.id}-stem`}>{q.stem}</h3>
    <fieldset disabled={answered} className="qd-options">
      <legend className="sr-only">Choose one answer</legend>
      {q.options.map((o) => {
        const state = !answered ? '' : o.key === q.correct ? 'is-correct' : o.key === picked ? 'is-wrong' : '';
        return <label key={o.key} className={`qd-option ${state}`}>
          <input type="radio" name={q.id} value={o.key} checked={picked === o.key} onChange={() => { setPicked(o.key); onAnswer(o.key === q.correct); }} />
          <span><strong>{o.key}.</strong> {o.text}</span>
        </label>;
      })}
    </fieldset>
    <div aria-live="polite">{answered && <div className="qd-feedback">
      <p className="qd-result">{picked === q.correct ? <><CheckCircle2 size={18} aria-hidden="true" /> Correct</> : <><XCircle size={18} aria-hidden="true" /> Not quite: the answer is {q.correct}</>}</p>
      <ul>{q.options.map((o) => <li key={o.key}><strong>{o.key}.</strong> {o.rationale}</li>)}</ul>
      <p><strong>Key point:</strong> {q.keyPoint}</p>
    </div>}</div>
  </article>;
}

export default function FreeDemo() {
  usePageMeta('Free demo', 'Try sample exam-style questions and a short lesson with no account needed.');
  const { data, isLoading, isError, refetch } = useGetPage('free-demo');
  const demo = useMemo(() => parseDemo(data?.data), [data]);
  const [score, setScore] = useState({ answered: 0, correct: 0 });
  return <SiteLayout><main>
    <PageHero eyebrow="Free demo" title="Try it before you sign up." intro="A few sample questions and one lesson. No account needed." />
    <section className="section"><div className="container qd-layout">
      <div className="notice" role="note">Sample content for demonstration only. It is not clinical advice.</div>
      {isLoading && <PageSkeleton label="Loading demo" />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {demo.questions.map((q, i) => <Question key={q.id} q={q} index={i} onAnswer={(ok) => setScore((s) => ({ answered: s.answered + 1, correct: s.correct + (ok ? 1 : 0) }))} />)}
      {demo.questions.length > 0 && <p className="qd-score" role="status">Answered {score.answered} of {demo.questions.length} · {score.correct} correct</p>}
      {demo.lesson && <article className="qd-lesson"><h2>{demo.lesson.title}</h2><Prose text={demo.lesson.body} /></article>}
      <div className="cta-panel"><div><h2>Want the full question bank?</h2></div><Link className="btn btn-primary" href="/pricing">See plans <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div></section>
  </main></SiteLayout>;
}
