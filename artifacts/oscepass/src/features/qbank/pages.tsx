import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import {
  useCreateQuiz, useFinishQuiz, useGetAnalyticsOverview, useGetPerformanceTrend,
  useGetQuiz, useGetQuizResult, useGetTopicPerformance, useListDemoQuestions,
  useListExams, useListMyNotes, useListQuizzes, useListTopics, useReportQuestion,
  useRetryIncorrect, useSetQuestionFlag, useSetQuestionNote, useSubmitAnswer,
  getGetQuizQueryKey, getGetQuizResultQueryKey, getListQuizzesQueryKey,
} from '@workspace/api-client-react';
import type { CreateQuizRequest, QuizItem, QuizMode } from '@workspace/api-client-react';
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Bookmark, Check, ChevronLeft,
  ChevronRight, Clock3, Flag, LoaderCircle, RefreshCw, ShieldCheck, Stethoscope,
} from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { usePageMeta } from '@/lib/usePageMeta';

function Workspace({ children }: { children: ReactNode }) {
  return <AppLayout><div className="study-workspace"><div className="study-wrap">{children}</div></div></AppLayout>;
}

function PageIntro({ eyebrow, title, children, action }: { eyebrow: string; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="study-topline"><div><div className="study-eyebrow">{eyebrow}</div><h1>{title}</h1><p className="study-lead">{children}</p></div>{action && <div className="study-header-actions">{action}</div>}</div>;
}

function ErrorText({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Please try again.';
  return <p className="study-error" role="alert">{message}</p>;
}

function EmptyPanel({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="study-state"><Activity size={23} aria-hidden="true" /><h2>{title}</h2><p>{text}</p>{action}</div>;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function modeName(mode: string) {
  return mode === 'tutor' ? 'Tutor' : mode === 'timed' ? 'Timed' : mode === 'custom' ? 'Custom' : 'Review';
}

export function QbankHome() {
  usePageMeta('Question bank', 'MRCEM single-best-answer practice and session history.');
  const quizzes = useListQuizzes({ limit: 20 });
  const rows = quizzes.data?.data ?? [];
  const active = rows.filter((item) => item.status === 'in_progress');
  const recent = rows.filter((item) => item.status !== 'in_progress').slice(0, 6);
  return <Workspace>
    <PageIntro eyebrow="MRCEM · SBA practice" title="Question bank" action={<Link className="study-btn study-btn-primary" href="/app/qbank/new" data-testid="link-start-practice"><Stethoscope size={16} /> Build a session</Link>}>
      Deliberate practice for the decisions you make in the emergency department.
    </PageIntro>
    <div className="study-grid">
      <section className="study-panel" aria-labelledby="recent-heading">
        <div className="study-panel-head"><div><h2 id="recent-heading">Your sessions</h2><p>Pick up where you left off, or review a completed paper.</p></div><button className="study-btn" type="button" onClick={() => quizzes.refetch()} aria-label="Refresh sessions" data-testid="button-refresh-sessions"><RefreshCw size={15} /> Refresh</button></div>
        {quizzes.isLoading ? <div role="status" aria-busy="true"><span className="study-state">Loading your sessions…</span></div> : quizzes.isError ? <ErrorState title="Your sessions could not be loaded" onRetry={() => quizzes.refetch()} /> : rows.length === 0 ? <EmptyPanel title="A clean slate" text="Start with a focused Tutor set or a timed paper. Your sessions will appear here." action={<Link className="study-btn study-btn-primary" href="/app/qbank/new">Set up practice</Link>} /> : <>
          {active.length > 0 && <div style={{ marginBottom: 24 }}>
            <div className="study-eyebrow" style={{ marginBottom: 8 }}>Ready to resume</div>
            {active.map((session) => <div className="study-session-row" key={session.id} data-testid={`session-resume-${session.id}`}>
              <div><div className="study-session-name">{modeName(session.mode)} session</div><div className="study-session-meta"><span>{session.questionCount} questions</span><span>Started {dateLabel(session.startedAt)}</span>{session.deadlineAt && <span className="study-pill study-pill-warm">Timed</span>}</div></div>
              <Link className="study-btn study-btn-primary" href={`/app/qbank/session/${session.id}`}>Resume <ArrowRight size={15} /></Link>
            </div>)}
          </div>}
          <div className="study-eyebrow" style={{ marginBottom: 8 }}>Recent history</div>
          {recent.length === 0 && active.length > 0 ? <p className="study-lead">Completed sessions will appear here.</p> : recent.map((session) => <div className="study-session-row" key={session.id} data-testid={`session-history-${session.id}`}>
            <div><div className="study-session-name">{modeName(session.mode)} session</div><div className="study-session-meta"><span>{session.questionCount} questions</span><span>{dateLabel(session.finishedAt ?? session.startedAt)}</span><span className={`study-pill ${session.status === 'completed' ? '' : 'study-pill-warm'}`}>{session.status.replace('_', ' ')}</span></div></div>
            {session.status === 'completed' ? <Link className="study-btn" href={`/app/qbank/review/${session.id}`}>Review <ArrowRight size={15} /></Link> : <Link className="study-btn" href={`/app/qbank/session/${session.id}`}>Open <ArrowRight size={15} /></Link>}
          </div>)}
        </>}
      </section>
      <aside className="study-panel">
        <div className="study-eyebrow">A good place to begin</div><h2 style={{ marginTop: 10 }}>Practise with purpose.</h2><p style={{ color: 'var(--study-muted)', fontSize: '.88rem' }}>Tutor mode reveals the teaching point after each response. Timed mode keeps explanations back until the end.</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          <Link className="study-btn study-btn-primary" href="/app/qbank/new">Choose your format <ArrowRight size={15} /></Link>
          <Link className="study-btn" href="/app/analytics"><BarChart3 size={15} /> View your progress</Link>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderTop: '1px solid var(--study-line)', paddingTop: 18, marginTop: 23, color: 'var(--study-muted)', fontSize: '.78rem' }}><ShieldCheck size={17} color="var(--study-accent)" /><span>Your progress is saved to your account, so you can return to an unfinished session on any device.</span></div>
      </aside>
    </div>
  </Workspace>;
}

export function NewQbankSession() {
  usePageMeta('Set up practice', 'Choose the format and scope of your MRCEM SBA practice.');
  const [, navigate] = useLocation();
  const exams = useListExams();
  const topics = useListTopics();
  const demo = useListDemoQuestions();
  const createQuiz = useCreateQuiz();
  const queryClient = useQueryClient();
  const availableExams = exams.data?.items ?? [];
  const [examId, setExamId] = useState('');
  const [mode, setMode] = useState<QuizMode>('tutor');
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(30);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<CreateQuizRequest['filter']>('all');
  useEffect(() => {
    if (!examId && availableExams.length) setExamId(availableExams[0].id);
  }, [examId, availableExams]);
  const visibleTopics = (topics.data ?? []).filter((topic) => !topic.examId || topic.examId === examId);
  function toggleTopic(id: string) {
    setTopicIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  function start() {
    if (!examId) return;
    createQuiz.mutate({ data: { examId, mode, ...(mode === 'custom' ? { questionCount: count, topicIds: topicIds.length ? topicIds : undefined, filter, timeLimitMinutes: minutes } : {}) } }, {
      onSuccess: (quiz) => {
        void queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey({ limit: 20 }) });
        navigate(`/app/qbank/session/${quiz.session.id}`);
      },
    });
  }
  const busy = exams.isLoading || topics.isLoading;
  return <Workspace>
    <PageIntro eyebrow="Session builder" title="Set up your practice" action={<Link className="study-btn" href="/app/qbank"><ArrowLeft size={15} /> Session history</Link>}>Choose the conditions that fit the work you want to do now.</PageIntro>
    {busy ? <PageSkeleton rows={3} label="Loading exams and topics" /> : exams.isError || topics.isError ? <ErrorState title="Practice options could not be loaded" onRetry={() => { void exams.refetch(); void topics.refetch(); }} /> : <>
      <div className="study-grid">
        <section className="study-panel">
          <div className="study-field"><label className="study-label" htmlFor="qbank-exam">Exam</label><select id="qbank-exam" className="study-select" value={examId} onChange={(event) => { setExamId(event.target.value); setTopicIds([]); }} data-testid="select-exam"><option value="">Choose an exam</option>{availableExams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}</select></div>
          <div className="study-eyebrow" style={{ marginTop: 26 }}>Choose your format</div>
          <div className="study-mode-grid" role="group" aria-label="Practice format">
            <button className="study-mode" type="button" aria-pressed={mode === 'tutor'} onClick={() => setMode('tutor')} data-testid="button-mode-tutor"><strong>Tutor</strong><span>Immediate feedback and explanations after each answer.</span></button>
            <button className="study-mode" type="button" aria-pressed={mode === 'timed'} onClick={() => setMode('timed')} data-testid="button-mode-timed"><strong>Timed</strong><span>Exam conditions. Your time limit is set and tracked by the server.</span></button>
            <button className="study-mode" type="button" aria-pressed={mode === 'custom'} onClick={() => setMode('custom')} data-testid="button-mode-custom"><strong>Custom</strong><span>Choose a length, topic focus and question set.</span></button>
          </div>
          {mode === 'custom' && <div className="study-form-grid" style={{ marginBottom: 22 }}>
            <div className="study-field"><label className="study-label" htmlFor="qbank-count">Question count</label><input className="study-input" id="qbank-count" type="number" min={1} max={180} value={count} onChange={(event) => setCount(Math.max(1, Math.min(180, Number(event.target.value))))} data-testid="input-question-count" /></div>
            <div className="study-field"><label className="study-label" htmlFor="qbank-time">Time limit (minutes)</label><input className="study-input" id="qbank-time" type="number" min={1} max={600} value={minutes} onChange={(event) => setMinutes(Math.max(1, Math.min(600, Number(event.target.value))))} data-testid="input-time-limit" /></div>
            <div className="study-field"><label className="study-label" htmlFor="qbank-filter">Question set</label><select id="qbank-filter" className="study-select" value={filter} onChange={(event) => setFilter(event.target.value as CreateQuizRequest['filter'])} data-testid="select-question-filter"><option value="all">All questions</option><option value="unseen">Unseen</option><option value="incorrect">Previously incorrect</option><option value="flagged">Flagged</option></select></div>
            <fieldset className="study-field" style={{ border: 0, padding: 0 }}>
              <legend className="study-label">Topic focus <span style={{ fontWeight: 400, color: 'var(--study-muted)' }}>(optional)</span></legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{visibleTopics.length ? visibleTopics.map((topic) => <label key={topic.id} className="study-pill" style={{ cursor: 'pointer', padding: '7px 10px' }}><input type="checkbox" checked={topicIds.includes(topic.id)} onChange={() => toggleTopic(topic.id)} style={{ marginRight: 6 }} />{topic.name}</label>) : <span className="study-lead">No topics are available for this exam.</span>}</div>
            </fieldset>
          </div>}
          {createQuiz.isError && <ErrorText error={createQuiz.error} />}
          <button className="study-btn study-btn-primary" type="button" disabled={!examId || createQuiz.isPending} onClick={start} data-testid="button-create-session">{createQuiz.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Stethoscope size={16} />} {createQuiz.isPending ? 'Preparing session…' : 'Start practice'} <ArrowRight size={15} /></button>
        </section>
        <aside className="study-panel">
          <div className="study-eyebrow">Question bank</div><h2 style={{ marginTop: 10 }}>Ready for a focused set?</h2><p style={{ color: 'var(--study-muted)', fontSize: '.86rem' }}>Your session begins only when you start. Unfinished work is saved against your account.</p>
          <div style={{ borderTop: '1px solid var(--study-line)', paddingTop: 17, marginTop: 20 }}><div className="study-eyebrow">Sample questions</div><p style={{ fontSize: '.85rem', margin: '8px 0 0' }}>{demo.isLoading ? 'Checking the sample set…' : demo.isError ? 'Sample preview is not available right now.' : `${(demo.data ?? []).length} sample ${((demo.data ?? []).length === 1) ? 'question is' : 'questions are'} available in the free preview.`}</p></div>
    {exams.data?.items.length === 0 && <p className="study-error">No exams are currently available to practise.</p>}
        </aside>
      </div>
    </>}
  </Workspace>;
}

function Countdown({ deadlineAt, serverTime }: { deadlineAt?: string | null; serverTime: string }) {
  const offset = useMemo(() => Date.now() - new Date(serverTime).getTime(), [serverTime]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const remaining = deadlineAt ? Math.max(0, Math.floor((new Date(deadlineAt).getTime() - (now - offset)) / 1000)) : undefined;
  return <span className="study-timer"><Clock3 size={16} aria-hidden="true" />{remaining === undefined ? 'No timer' : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`}</span>;
}

export function QbankSession() {
  const { id = '' } = useParams<{ id: string }>();
  usePageMeta('Practice session', 'Resume your MRCEM question-bank session.');
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const quiz = useGetQuiz(id);
  const submitAnswer = useSubmitAnswer();
  const finish = useFinishQuiz();
  const setFlag = useSetQuestionFlag();
  const saveNote = useSetQuestionNote();
  const report = useReportQuestion();
  const notes = useListMyNotes({ limit: 100 });
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<'wrong_answer' | 'unclear' | 'typo' | 'outdated' | 'other'>('unclear');
  const [reportMessage, setReportMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const openedAt = useRef(Date.now());
  const finishedRef = useRef(false);
  const localAnswersRef = useRef<Record<string, string>>({});
  const detail = quiz.data;
  const item = detail?.items[position];
  const question = item?.question;
  const itemNotes = notes.data?.data ?? [];
  const initializedQuestionRef = useRef<string | null>(null);
  const finishMutateRef = useRef(finish.mutate);
  finishMutateRef.current = finish.mutate;
  const topics = useListTopics();
  useEffect(() => {
    if (!item || notes.isLoading || initializedQuestionRef.current === item.sessionQuestionId) return;
    initializedQuestionRef.current = item.sessionQuestionId;
    setSelected(localAnswersRef.current[item.sessionQuestionId] ?? item.answer?.selectedOptionId ?? null);
    setNoteText(itemNotes.find((note) => note.questionId === item.question.id)?.body ?? '');
    openedAt.current = Date.now();
  }, [item?.sessionQuestionId, notes.isLoading]);
  useEffect(() => {
    if (!detail || detail.session.status !== 'in_progress' || !detail.session.deadlineAt) return;
    const serverOffset = Date.now() - new Date(detail.session.serverTime).getTime();
    const checkDeadline = () => {
      const msRemaining = new Date(detail.session.deadlineAt!).getTime() - (Date.now() - serverOffset);
      if (msRemaining <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        finishMutateRef.current({ id }, { onSuccess: (result) => { void queryClient.invalidateQueries({ queryKey: getGetQuizResultQueryKey(id) }); void queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey({ limit: 20 }) }); navigate(`/app/qbank/review/${result.session.id}`); }, onError: () => { finishedRef.current = false; } });
      }
    };
    checkDeadline();
    const interval = window.setInterval(checkDeadline, 1000);
    return () => window.clearInterval(interval);
  }, [detail, id, navigate, queryClient]);
  useEffect(() => {
    if (detail?.session.status === 'completed' || detail?.session.status === 'expired') navigate(`/app/qbank/review/${id}`);
  }, [detail?.session.status, id, navigate]);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!question || event.altKey || event.ctrlKey || event.metaKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) return;
      if (/^[1-5]$/.test(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option) choose(option.id);
      } else if (event.key === 'ArrowRight') setPosition((index) => Math.min(index + 1, (detail?.items.length ?? 1) - 1));
      else if (event.key === 'ArrowLeft') setPosition((index) => Math.max(index - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  function choose(optionId: string) {
    if (!detail || !item || detail.session.status !== 'in_progress') return;
    localAnswersRef.current[item.sessionQuestionId] = optionId;
    setSelected(optionId);
    setSaveMessage('Saving answer…');
    submitAnswer.mutate({ id, questionId: item.question.id, data: { selectedOptionId: optionId, timeSpentMs: Math.max(0, Date.now() - openedAt.current) } }, {
      onSuccess: () => {
        setSaveMessage('Answer saved');
        void queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(id) });
        void queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey({ limit: 20 }) });
      },
      onError: (error) => setSaveMessage(error instanceof Error ? error.message : 'Answer could not be saved.'),
    });
  }
  function persistNote() {
    if (!question || detail?.session.status !== 'in_progress') return;
    saveNote.mutate({ id: question.id, data: { body: noteText } }, { onSuccess: () => { setSaveMessage('Note saved'); void notes.refetch(); }, onError: () => setSaveMessage('Note could not be saved.') });
  }
  function toggleFlag() {
    if (!question || !item) return;
    setFlag.mutate({ id: question.id, data: { flagged: !item.flagged } }, {
      onSuccess: () => { setSaveMessage(item.flagged ? 'Flag removed' : 'Question flagged'); void queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(id) }); },
      onError: () => setSaveMessage('Flag could not be updated.'),
    });
  }
  function sendReport(event: FormEvent) {
    event.preventDefault();
    if (!question || reportMessage.trim().length < 5) return;
    report.mutate({ id: question.id, data: { category: reportCategory, message: reportMessage.trim() } }, { onSuccess: () => { setReportOpen(false); setReportMessage(''); setSaveMessage('Question report sent'); }, onError: () => setSaveMessage('Report could not be sent. Please try again.') });
  }
  function finishSession() {
    if (!window.confirm('Finish this session and see your results? You will not be able to change your answers afterwards.')) return;
    finish.mutate({ id }, { onSuccess: (result) => { void queryClient.invalidateQueries({ queryKey: getGetQuizResultQueryKey(id) }); void queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey({ limit: 20 }) }); navigate(`/app/qbank/review/${result.session.id}`); } });
  }
  if (quiz.isLoading) return <Workspace><PageSkeleton label="Loading saved session" /></Workspace>;
  if (quiz.isError) return <Workspace><ErrorState title="This session could not be resumed" onRetry={() => quiz.refetch()} /></Workspace>;
  if (!detail || !item || !question) return <Workspace><EmptyPanel title="No questions in this session" text="Return to your question bank and start a new session." action={<Link className="study-btn" href="/app/qbank">Question bank</Link>} /></Workspace>;
  const topicNames = (question.topicIds ?? []).map((topicId) => topics.data?.find((topic) => topic.id === topicId)?.name).filter(Boolean);
  const completed = detail.session.status !== 'in_progress';
  const feedback = item.feedback;
  return <Workspace>
    <PageIntro eyebrow={`${modeName(detail.session.mode)} session`} title={`Question ${position + 1} of ${detail.items.length}`} action={<><span className="study-save-state" role="status" aria-live="polite">{saveMessage || (submitAnswer.isPending ? 'Saving answer…' : 'Saved to your account')}</span><Link className="study-btn" href="/app/qbank"><ArrowLeft size={15} /> Exit session</Link></>}>
      {topicNames.length ? topicNames.join(' · ') : 'MRCEM SBA'}{question.difficultyId ? ' · SBA question' : ''}
    </PageIntro>
    <div className="study-panel" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><span className="study-eyebrow">Session progress</span><Countdown deadlineAt={detail.session.deadlineAt} serverTime={detail.session.serverTime} /></div>
      <div className="study-bar" style={{ marginTop: 11 }} role="progressbar" aria-valuenow={position + 1} aria-valuemin={1} aria-valuemax={detail.items.length} aria-label={`Question ${position + 1} of ${detail.items.length}`}><span style={{ width: `${((position + 1) / detail.items.length) * 100}%` }} /></div>
    </div>
    <div className="study-question-layout">
      <article className="study-panel">
        <div className="study-eyebrow">Single best answer</div>
        {question.leadIn && <p style={{ fontWeight: 700, margin: '20px 0 0' }}>{question.leadIn}</p>}
        <div className="study-question-stem">{question.stem}</div>
        <fieldset role="radiogroup" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="study-label">Select one answer</legend>
          {question.options.map((option, index) => <button type="button" role="radio" aria-checked={selected === option.id} className="study-option" key={option.id} onClick={() => choose(option.id)} disabled={completed || submitAnswer.isPending} data-testid={`button-option-${option.id}`}><span className="study-option-key">{index + 1}</span><span>{option.text}</span></button>)}
        </fieldset>
        {detail.session.mode === 'tutor' && feedback && <div className="study-answer-rationale" style={{ marginTop: 17 }}><strong>Teaching point</strong><p>{feedback.explanation}</p>{feedback.keyPoint && <p><strong>Key point:</strong> {feedback.keyPoint}</p>}</div>}
        <div className="study-question-controls">
          <button className="study-btn" type="button" onClick={() => setPosition(Math.max(0, position - 1))} disabled={position === 0}><ChevronLeft size={16} /> Previous</button>
          <span className="study-save-state">Use keys 1–5 to select, ← → to move</span>
          <button className="study-btn" type="button" onClick={() => setPosition(Math.min(detail.items.length - 1, position + 1))} disabled={position === detail.items.length - 1}>Next <ChevronRight size={16} /></button>
        </div>
      </article>
      <aside className="study-question-side">
        <section className="study-panel"><div className="study-panel-head"><div><h2>Question map</h2><p>{detail.items.filter((entry) => entry.answer?.selectedOptionId).length} answered</p></div></div><div className="study-nav-dots">{detail.items.map((entry, index) => <button type="button" className="study-nav-dot" key={entry.sessionQuestionId} aria-label={`Go to question ${index + 1}${entry.answer?.selectedOptionId ? ', answered' : ''}`} aria-current={index === position} data-answered={!!entry.answer?.selectedOptionId} onClick={() => setPosition(index)} data-testid={`button-question-${index + 1}`}>{index + 1}</button>)}</div></section>
        <section className="study-panel" style={{ display: 'grid', gap: 13 }}>
          <button className="study-btn" type="button" aria-pressed={item.flagged} onClick={toggleFlag} disabled={setFlag.isPending} data-testid="button-flag-question"><Bookmark size={16} /> {item.flagged ? 'Remove flag' : 'Flag for review'}</button>
          <div className="study-field"><label className="study-label" htmlFor="question-note">Your note</label><textarea className="study-textarea" id="question-note" maxLength={5000} value={noteText} onChange={(event) => setNoteText(event.target.value)} onBlur={persistNote} placeholder="Add a note to revisit later" data-testid="input-question-note" /><span className="study-save-state">Saved when you leave this field</span></div>
          <button className="study-btn study-btn-quiet" type="button" onClick={() => setReportOpen((open) => !open)}><Flag size={15} /> Report a problem</button>
          {reportOpen && <form onSubmit={sendReport} className="study-field"><label className="study-label" htmlFor="report-category">What needs attention?</label><select className="study-select" id="report-category" value={reportCategory} onChange={(event) => setReportCategory(event.target.value as typeof reportCategory)}><option value="unclear">Unclear wording</option><option value="wrong_answer">Answer appears wrong</option><option value="typo">Typographical error</option><option value="outdated">Outdated information</option><option value="other">Other</option></select><textarea className="study-textarea" aria-label="Report details" minLength={5} maxLength={2000} value={reportMessage} onChange={(event) => setReportMessage(event.target.value)} required placeholder="Tell us what you noticed" /><button className="study-btn" type="submit" disabled={report.isPending || reportMessage.trim().length < 5}>{report.isPending ? 'Sending…' : 'Send report'}</button></form>}
        </section>
        {finish.isError && <ErrorText error={finish.error} />}
        <button className="study-btn study-btn-primary" type="button" onClick={finishSession} disabled={finish.isPending || completed} data-testid="button-finish-session">{finish.isPending ? 'Finishing…' : completed ? 'Session complete' : 'Finish session'} <Check size={15} /></button>
      </aside>
    </div>
  </Workspace>;
}

function ResultItem({ item, index }: { item: QuizItem; index: number }) {
  const feedback = item.feedback;
  const chosen = item.answer?.selectedOptionId;
  const chosenLabel = item.question.options.find((option) => option.id === chosen)?.label ?? 'No answer';
  const correctIds = feedback?.correctOptionIds ?? [];
  return <article className="study-review-item" data-testid={`review-question-${item.sessionQuestionId}`}>
    <div className="study-session-meta"><span>Question {index + 1}</span><span className={`study-pill ${item.answer?.isCorrect ? '' : 'study-pill-warm'}`}>{item.answer?.isCorrect ? 'Correct' : 'Review'}</span></div>
    <h3>{item.question.stem}</h3><p>Your answer: {chosenLabel}{item.answer?.isCorrect === undefined ? '' : item.answer.isCorrect ? ' · Correct' : ' · Incorrect'}</p>
    {feedback && <div className="study-answer-rationale"><strong>Explanation</strong><p>{feedback.explanation}</p>{item.question.options.map((option) => {
      const optionFeedback = feedback.options.find((entry) => entry.optionId === option.id);
      return <p key={option.id}><strong>{option.label}. {option.text}</strong>{correctIds.includes(option.id) ? ' — Correct answer.' : ''} {optionFeedback?.rationale}</p>;
    })}{feedback.keyPoint && <p><strong>Key point:</strong> {feedback.keyPoint}</p>}{feedback.references?.map((reference) => <p key={reference.title}>{reference.url ? <a href={reference.url} target="_blank" rel="noreferrer">{reference.title}</a> : reference.title}</p>)}</div>}
    {!feedback && <p>Explanation is not available for this response.</p>}
  </article>;
}

export function QbankReview() {
  const { id = '' } = useParams<{ id: string }>();
  usePageMeta('Session review', 'Results, topic breakdown and explanations for your MRCEM SBA session.');
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const result = useGetQuizResult(id);
  const retry = useRetryIncorrect();
  if (result.isLoading) return <Workspace><PageSkeleton label="Loading session results" /></Workspace>;
  if (result.isError) return <Workspace><ErrorState title="Session results could not be loaded" onRetry={() => result.refetch()} /></Workspace>;
  const data = result.data;
  if (!data) return <Workspace><EmptyPanel title="Results not found" text="Return to your question bank to see your sessions." action={<Link className="study-btn" href="/app/qbank">Question bank</Link>} /></Workspace>;
  return <Workspace>
    <PageIntro eyebrow="Session review" title="The learning is in the review." action={<><Link className="study-btn" href="/app/qbank"><ArrowLeft size={15} /> All sessions</Link><button className="study-btn study-btn-primary" type="button" disabled={retry.isPending || data.correct === data.total} onClick={() => retry.mutate({ id }, { onSuccess: (quiz) => { void queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey({ limit: 20 }) }); navigate(`/app/qbank/session/${quiz.session.id}`); } })} data-testid="button-retry-incorrect">{retry.isPending ? 'Preparing…' : 'Retry incorrect'} <ArrowRight size={15} /></button></>}>
      Completed {dateLabel(data.session.finishedAt ?? data.session.startedAt)} · {modeName(data.session.mode)} mode
    </PageIntro>
    {retry.isError && <ErrorText error={retry.error} />}
    <div className="study-stat-grid">
      <div className="study-stat"><strong>{data.percent}%</strong><span>Score</span></div>
      <div className="study-stat"><strong>{data.correct}<span style={{ display: 'inline', fontSize: '1rem' }}> / {data.total}</span></strong><span>Correct answers</span></div>
      <div className="study-stat"><strong>{Math.floor(data.totalTimeSeconds / 60)}<span style={{ display: 'inline', fontSize: '1rem' }}> min</span></strong><span>Time in session</span></div>
    </div>
    {data.byTopic.length > 0 && <section className="study-panel" style={{ marginTop: 22 }}><div className="study-panel-head"><div><h2>Topic breakdown</h2><p>Use this to choose the focus of your next session.</p></div></div>{data.byTopic.map((topic) => <div className="study-table-row" key={topic.topicId}><span>{topic.topicName}</span><span>{topic.correct}/{topic.answered}</span><strong>{topic.percent}%</strong><div className="study-bar" style={{ gridColumn: '1 / -1', height: 5 }}><span style={{ width: `${Math.max(0, Math.min(100, topic.percent))}%` }} /></div></div>)}</section>}
    <section className="study-panel" style={{ marginTop: 22 }}><div className="study-panel-head"><div><h2>Answer review</h2><p>Explanations and rationales supplied for this session.</p></div><span className="study-pill">{data.items.length} questions</span></div>{data.items.map((entry, index) => <ResultItem key={entry.sessionQuestionId} item={entry} index={index} />)}</section>
  </Workspace>;
}

function TrendChart({ values }: { values: { day: string; answered: number; percent: number }[] }) {
  if (!values.length) return <EmptyPanel title="No trend to chart yet" text="Complete a few questions and your daily performance will appear here." />;
  const width = 680, height = 190, inset = 24;
  const points = values.map((point, index) => ({ x: inset + index * ((width - inset * 2) / Math.max(values.length - 1, 1)), y: height - inset - (Math.max(0, Math.min(100, point.percent)) / 100) * (height - inset * 2) }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return <svg className="study-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily question accuracy trend">
    {[0, 50, 100].map((tick) => <g key={tick}><line x1={inset} x2={width - inset} y1={height - inset - tick / 100 * (height - inset * 2)} y2={height - inset - tick / 100 * (height - inset * 2)} stroke="#e3e9e2" strokeDasharray="3 5" /><text x="0" y={height - inset - tick / 100 * (height - inset * 2) + 3}>{tick}%</text></g>)}
    <path d={path} fill="none" stroke="#147d73" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {points.map((point, index) => <circle key={values[index].day} cx={point.x} cy={point.y} r="4" fill="#fffefa" stroke="#147d73" strokeWidth="2"><title>{values[index].day}: {values[index].percent}% ({values[index].answered} answered)</title></circle>)}
    {values.length > 1 && <><text x={inset} y={height - 2}>{values[0].day}</text><text x={width - inset - 50} y={height - 2}>{values.at(-1)?.day}</text></>}
  </svg>;
}

export function QbankAnalytics() {
  usePageMeta('Your analytics', 'Track question volume, accuracy and topic performance.');
  const [days, setDays] = useState(30);
  const overview = useGetAnalyticsOverview();
  const topics = useGetTopicPerformance();
  const trend = useGetPerformanceTrend({ days });
  const exams = useListExams();
  const loading = overview.isLoading || topics.isLoading || trend.isLoading;
  const error = overview.isError || topics.isError || trend.isError;
  const sortedTopics = [...(topics.data ?? [])].sort((a, b) => a.percent - b.percent);
  return <Workspace>
    <PageIntro eyebrow="Your progress" title="A clearer view of your preparation." action={<><Link className="study-btn" href="/app/qbank"><ArrowLeft size={15} /> Question bank</Link><button className="study-btn" type="button" aria-label="Refresh analytics" onClick={() => { void overview.refetch(); void topics.refetch(); void trend.refetch(); }}><RefreshCw size={15} /> Refresh</button></>}>
      Use your question history to spot what is secure and where another pass will count.
    </PageIntro>
    {exams.data?.items.length === 0 && <div className="study-state" role="status">No published exams are available at the moment.</div>}
    {loading ? <PageSkeleton label="Loading your analytics" /> : error ? <div className="study-panel"><ErrorState title="Your analytics could not be loaded" onRetry={() => { void overview.refetch(); void topics.refetch(); void trend.refetch(); }} /></div> : <>
      {overview.data && <div className="study-stat-grid">
        <div className="study-stat"><strong>{overview.data.questionsAnswered.toLocaleString('en-GB')}</strong><span>Questions answered</span></div>
        <div className="study-stat"><strong>{overview.data.percentCorrect}%</strong><span>Overall accuracy</span></div>
        <div className="study-stat"><strong>{overview.data.streakDays}</strong><span>Day study streak</span></div>
        {overview.data.readiness !== undefined && overview.data.readiness !== null && <div className="study-stat"><strong>{overview.data.readiness}%</strong><span>Readiness</span></div>}
      </div>}
      {overview.data && <section className="study-panel" style={{ marginTop: 17 }}>
        <div className="study-panel-head"><div><h2>Today’s practice</h2><p>{overview.data.answeredToday} of {overview.data.dailyGoal} question goal answered today.</p></div><span className="study-pill">{Math.min(100, Math.round(overview.data.answeredToday / Math.max(overview.data.dailyGoal, 1) * 100))}%</span></div>
        <div className="study-bar" role="progressbar" aria-label="Daily question goal" aria-valuenow={overview.data.answeredToday} aria-valuemin={0} aria-valuemax={overview.data.dailyGoal}><span style={{ width: `${Math.min(100, overview.data.answeredToday / Math.max(overview.data.dailyGoal, 1) * 100)}%` }} /></div>
      </section>}
      <div className="study-analytics-grid">
        <section className="study-panel"><div className="study-panel-head"><div><h2>Accuracy over time</h2><p>Daily performance across your question practice.</p></div><label className="study-label" htmlFor="trend-days" style={{ margin: 0 }}><span className="sr-only">Trend range</span><select id="trend-days" className="study-select" value={days} onChange={(event) => setDays(Number(event.target.value))} data-testid="select-trend-range"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label></div><TrendChart values={trend.data ?? []} /></section>
        <section className="study-panel"><div className="study-panel-head"><div><h2>Topic performance</h2><p>Your topics, ordered by current accuracy.</p></div></div>
          {!sortedTopics.length ? <EmptyPanel title="Topic performance is building" text="Answer questions across the bank to see how you are doing by topic." /> : sortedTopics.map((topic) => <div className="study-table-row" key={topic.topicId} data-testid={`topic-performance-${topic.topicId}`}><span>{topic.topicName}<small style={{ display: 'block', color: 'var(--study-muted)' }}>{topic.answered} answered</small></span><div className="study-bar"><span style={{ width: `${Math.max(0, Math.min(100, topic.percent))}%` }} /></div><strong>{topic.percent}%</strong></div>)}
        </section>
      </div>
    </>}
  </Workspace>;
}
