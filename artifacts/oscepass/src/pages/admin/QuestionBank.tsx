import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowDown, ArrowUpRight, BookOpenCheck, Check, ChevronDown, CirclePlus, ExternalLink, FileText, Filter, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  getAdminListTagsQueryKey,
  getAdminListQuestionsQueryKey,
  useAdminChangeQuestionStatus,
  useAdminCreateQuestion,
  useAdminDeleteQuestion,
  useAdminListQuestions,
  useAdminListTags,
  useAdminUpdateQuestion,
  useListDifficultyLevels,
  useListExams,
  useListTopics,
} from '@workspace/api-client-react';
import type { AdminQuestion, AdminQuestionType, QuestionInput, QuestionStatus } from '@workspace/api-client-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { Form } from '@/components/ui/form';
import { usePageMeta } from '@/lib/usePageMeta';
import './question-bank.css';

type QuestionOption = QuestionInput['options'][number];
type QuestionReference = NonNullable<QuestionInput['references']>[number];

const statuses: QuestionStatus[] = ['draft', 'review', 'approved', 'published', 'archived'];
const questionTypes: { value: AdminQuestionType; label: string }[] = [
  { value: 'sba', label: 'Single best answer' },
  { value: 'multi_select', label: 'Multiple select' },
  { value: 'image', label: 'Image question' },
  { value: 'emq', label: 'Extended matching' },
];
const alphabet = 'ABCDEF';

function emptyQuestion(): QuestionInput {
  return {
    examId: '',
    type: 'sba',
    stem: '',
    leadIn: '',
    explanation: '',
    keyPoint: '',
    references: [],
    difficultyId: '',
    year: null,
    sourceLabel: '',
    isSample: false,
    topicIds: [],
    tagIds: [],
    options: [
      { label: 'A', text: '', isCorrect: true, rationale: '', position: 0 },
      { label: 'B', text: '', isCorrect: false, rationale: '', position: 1 },
    ],
    changeNote: '',
  };
}

function questionInput(question: AdminQuestion): QuestionInput {
  return {
    examId: question.examId,
    type: question.type,
    stem: question.stem,
    leadIn: question.leadIn ?? '',
    explanation: question.explanation ?? '',
    keyPoint: question.keyPoint ?? '',
    references: question.references ?? [],
    difficultyId: question.difficultyId ?? '',
    year: question.year ?? null,
    sourceLabel: question.sourceLabel ?? '',
    isSample: question.isSample,
    topicIds: question.topicIds ?? [],
    tagIds: question.tagIds ?? [],
    options: question.options.map((option, index) => ({
      label: option.label,
      text: option.text,
      isCorrect: option.isCorrect,
      rationale: option.rationale ?? '',
      position: option.position ?? index,
    })),
    changeNote: '',
  };
}

function statusLabel(status: QuestionStatus) {
  return status.replace('_', ' ');
}

function dateLabel(value?: string | null) {
  if (!value) return 'Not reviewed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reviewed' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function apiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

export default function QuestionBank() {
  usePageMeta('Question bank', 'Author, review and publish clinical exam questions.');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [editor, setEditor] = useState<{ question?: AdminQuestion; values: QuestionInput } | null>(null);
  const [saveError, setSaveError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const questionForm = useForm<QuestionInput>({ defaultValues: emptyQuestion() });
  const currentCursor = pageCursors[pageCursors.length - 1];

  const listParams = useMemo(() => ({
    limit: 30,
    ...(search.trim() ? { q: search.trim() } : {}),
    ...(examFilter ? { examId: examFilter } : {}),
    ...(topicFilter ? { topicId: topicFilter } : {}),
    ...(tagFilter ? { tagId: tagFilter } : {}),
    ...(statusFilter ? { status: statusFilter as QuestionStatus } : {}),
    ...(currentCursor ? { cursor: currentCursor } : {}),
  }), [search, examFilter, topicFilter, tagFilter, statusFilter, currentCursor]);
  const tagParams = useMemo(() => ({ limit: 100, ...(tagSearch.trim() ? { q: tagSearch.trim() } : {}) }), [tagSearch]);
  const questionsQuery = useAdminListQuestions(listParams);
  const tagsQuery = useAdminListTags(tagParams, { query: { queryKey: getAdminListTagsQueryKey(tagParams) } });
  const examsQuery = useListExams();
  const topicsQuery = useListTopics(examFilter ? { examId: examFilter } : undefined);
  const editorTopicsQuery = useListTopics(editor?.values.examId ? { examId: editor.values.examId } : undefined);
  const difficultyQuery = useListDifficultyLevels();
  const createQuestion = useAdminCreateQuestion();
  const updateQuestion = useAdminUpdateQuestion();
  const deleteQuestion = useAdminDeleteQuestion();
  const changeStatus = useAdminChangeQuestionStatus();
  const questions = questionsQuery.data?.data ?? [];
  const topics = topicsQuery.data ?? [];
  const exams = examsQuery.data?.items ?? [];
  const difficulties = difficultyQuery.data ?? [];
  const tags = tagsQuery.data?.data ?? [];

  function resetListPages() {
    setPageCursors([undefined]);
  }

  function openNew() {
    setSaveError('');
    setStatusError('');
    setReviewNote('');
    const values = emptyQuestion();
    questionForm.reset(values);
    setEditor({ values });
  }

  function openEdit(question: AdminQuestion) {
    setSaveError('');
    setStatusError('');
    setReviewNote('');
    const values = questionInput(question);
    questionForm.reset(values);
    setEditor({ question, values });
  }

  function updateValues(patch: Partial<QuestionInput>) {
    setEditor((current) => current ? { ...current, values: { ...current.values, ...patch } } : current);
  }

  function updateOption(index: number, patch: Partial<QuestionOption>) {
    setEditor((current) => current ? {
      ...current,
      values: { ...current.values, options: current.values.options.map((option, position) => position === index ? { ...option, ...patch } : option) },
    } : current);
  }

  function changeType(type: AdminQuestionType) {
    setEditor((current) => {
      if (!current) return current;
      const options = current.values.options.map((option, index) => ({
        ...option,
        isCorrect: type === 'multi_select' ? option.isCorrect : index === current.values.options.findIndex((entry) => entry.isCorrect),
      }));
      if (!options.some((option) => option.isCorrect) && options.length) options[0].isCorrect = true;
      return { ...current, values: { ...current.values, type, options } };
    });
  }

  function addOption() {
    setEditor((current) => {
      if (!current || current.values.options.length >= 6) return current;
      const index = current.values.options.length;
      return { ...current, values: { ...current.values, options: [...current.values.options, { label: alphabet[index], text: '', isCorrect: false, rationale: '', position: index }] } };
    });
  }

  function removeOption(index: number) {
    setEditor((current) => {
      if (!current || current.values.options.length <= 2) return current;
      const options = current.values.options.filter((_, optionIndex) => optionIndex !== index).map((option, position) => ({ ...option, label: alphabet[position], position }));
      if (!options.some((option) => option.isCorrect)) options[0].isCorrect = true;
      return { ...current, values: { ...current.values, options } };
    });
  }

  function toggleId(key: 'topicIds' | 'tagIds', id: string) {
    const values = editor?.values[key] ?? [];
    updateValues({ [key]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id] });
  }

  function addReference() {
    updateValues({ references: [...(editor?.values.references ?? []), { title: '', url: '' }] });
  }

  function updateReference(index: number, patch: Partial<QuestionReference>) {
    updateValues({ references: (editor?.values.references ?? []).map((reference, itemIndex) => itemIndex === index ? { ...reference, ...patch } : reference) });
  }

  function removeReference(index: number) {
    updateValues({ references: (editor?.values.references ?? []).filter((_, itemIndex) => itemIndex !== index) });
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setSaveError('');
    const values = editor.values;
    const correctCount = values.options.filter((option) => option.isCorrect).length;
    if (values.options.length < 2 || values.options.length > 6) {
      setSaveError('Add between 2 and 6 answer options before saving.');
      return;
    }
    if (values.type === 'multi_select' ? correctCount < 1 : correctCount !== 1) {
      setSaveError(values.type === 'multi_select' ? 'A multiple-select question must have at least one correct option.' : 'This format must have exactly one correct option.');
      return;
    }
    if (!values.examId || !values.stem.trim()) {
      setSaveError('Choose an exam and enter the question stem.');
      return;
    }
    const payload: QuestionInput = {
      ...values,
      stem: values.stem.trim(),
      leadIn: values.leadIn?.trim() || null,
      explanation: values.explanation?.trim() ?? '',
      keyPoint: values.keyPoint?.trim() || null,
      references: (values.references ?? []).filter((reference) => reference.title.trim()).map((reference) => ({ title: reference.title.trim(), ...(reference.url?.trim() ? { url: reference.url.trim() } : {}) })),
      difficultyId: values.difficultyId || null,
      year: values.year ? Number(values.year) : null,
      sourceLabel: values.sourceLabel?.trim() || null,
      options: values.options.map((option, position) => ({ ...option, label: alphabet[position], position, text: option.text.trim(), rationale: option.rationale?.trim() ?? '' })),
      topicIds: values.topicIds ?? [],
      tagIds: values.tagIds ?? [],
      changeNote: values.changeNote?.trim() ?? '',
    };
    try {
      if (editor.question) await updateQuestion.mutateAsync({ id: editor.question.id, data: payload });
      else await createQuestion.mutateAsync({ data: payload });
      await queryClient.invalidateQueries({ queryKey: getAdminListQuestionsQueryKey() });
      setNotice(editor.question ? 'Question changes saved' : 'Question created as a draft');
      window.setTimeout(() => setNotice(''), 2800);
      setEditor(null);
    } catch (error) {
      setSaveError(apiError(error, 'The question could not be saved. Check the details and try again.'));
    }
  }

  async function transition(question: AdminQuestion, status: QuestionStatus) {
    setStatusError('');
    const reviewerTransition = status === 'approved' || status === 'published';
    if (reviewerTransition && !window.confirm(`Move this question to ${statusLabel(status)}? The workflow is recorded separately from editing.`)) return;
    try {
      await changeStatus.mutateAsync({ id: question.id, data: { status, ...(reviewerTransition ? { note: reviewNote.trim() || undefined } : {}) } });
      await queryClient.invalidateQueries({ queryKey: getAdminListQuestionsQueryKey() });
      if (editor?.question?.id === question.id) {
        setEditor(null);
      }
      setNotice(`Question moved to ${statusLabel(status)}`);
      window.setTimeout(() => setNotice(''), 2800);
    } catch (error) {
      setStatusError(apiError(error, `Status could not be changed to ${statusLabel(status)}. No change was made.`));
    }
  }

  async function removeQuestion(question: AdminQuestion) {
    if (!window.confirm('Delete this question? This action is audited and the question will be removed from the active bank.')) return;
    setSaveError('');
    try {
      await deleteQuestion.mutateAsync({ id: question.id });
      await queryClient.invalidateQueries({ queryKey: getAdminListQuestionsQueryKey() });
      setEditor(null);
      setNotice('Question removed from the active bank');
      window.setTimeout(() => setNotice(''), 2800);
    } catch (error) {
      setSaveError(apiError(error, 'This question could not be deleted. Please try again.'));
    }
  }

  const saving = createQuestion.isPending || updateQuestion.isPending;
  const openedQuestion = editor?.question;

  return <AdminLayout>
    <main className="question-bank">
      <header className="qb-header">
        <div>
          <div className="qb-eyebrow"><span className="qb-eyebrow-mark" /> EXAM CONTENT · EDITORIAL WORKSPACE</div>
          <h1>Question bank</h1>
          <p>Author, inspect and move clinical questions through review with their evidence in view.</p>
        </div>
          <button className="qb-button qb-button-primary" type="button" onClick={openNew} data-testid="button-create-question"><CirclePlus size={17} /> New question</button>
      </header>
      <div className="qb-rule" />
      <section className="qb-workspace" aria-label="Question bank">
        <div className="qb-toolbar">
          <div className="qb-count-block" data-testid="text-question-count">
            <span className="qb-count-icon"><BookOpenCheck size={18} /></span>
            <span><strong>{questionsQuery.isLoading ? '—' : questions.length}</strong><small>questions in this view</small></span>
          </div>
          <label className="qb-search"><Search size={17} /><span className="sr-only">Search question content</span><input data-testid="input-question-search" value={search} onChange={(event) => { setSearch(event.target.value); resetListPages(); }} placeholder="Search stems, explanations, sources…" /></label>
          <div className="qb-filter-icon"><Filter size={15} /><span>Filter by</span></div>
          <label className="qb-select-wrap"><span className="sr-only">Filter by status</span><select data-testid="select-question-status-filter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); resetListPages(); }}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><ChevronDown size={14} /></label>
          <label className="qb-select-wrap"><span className="sr-only">Filter by exam</span><select data-testid="select-question-exam-filter" value={examFilter} onChange={(event) => { setExamFilter(event.target.value); setTopicFilter(''); resetListPages(); }}><option value="">All exams</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.shortName || exam.name}</option>)}</select><ChevronDown size={14} /></label>
          <label className="qb-select-wrap"><span className="sr-only">Filter by topic</span><select data-testid="select-question-topic-filter" value={topicFilter} onChange={(event) => { setTopicFilter(event.target.value); resetListPages(); }} disabled={!examFilter}><option value="">All topics</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select><ChevronDown size={14} /></label>
          <label className="qb-select-wrap"><span className="sr-only">Filter by tag</span><select data-testid="select-question-tag-filter" value={tagFilter} onChange={(event) => { setTagFilter(event.target.value); resetListPages(); }}><option value="">All tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select><ChevronDown size={14} /></label>
        </div>
        {notice && <div className="qb-notice" role="status"><Check size={15} />{notice}</div>}
        {statusError && <div className="qb-error" role="alert">{statusError}<button type="button" onClick={() => setStatusError('')}>Dismiss</button></div>}
        {questionsQuery.isLoading ? <PageSkeleton rows={4} label="Loading question bank" /> : questionsQuery.isError ? <ErrorState title="Question bank could not be loaded" onRetry={() => void questionsQuery.refetch()} /> : questions.length === 0 ? (
          <div className="qb-empty">
            <span className="qb-empty-icon"><FileText size={23} /></span>
            <h2>{search || statusFilter || examFilter ? 'No questions match these filters' : 'Start a question set'}</h2>
            <p>{search || statusFilter || examFilter ? 'Clear one or more filters, or try a different search.' : 'Create an exam question with its rationale and clinical references ready for review.'}</p>
            {search || statusFilter || examFilter ? <button className="qb-button qb-button-outline" type="button" onClick={() => { setSearch(''); setStatusFilter(''); setExamFilter(''); setTopicFilter(''); setCursor(undefined); }}>Clear filters</button> : <button className="qb-button qb-button-primary" type="button" onClick={openNew}><Plus size={16} /> Create first question</button>}
          </div>
        ) : (
          <>
            <div className="qb-table-scroll">
              <table className="qb-table">
                <thead><tr><th>Question</th><th>Exam / topic</th><th>Format</th><th>Review state</th><th>Last reviewed</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{questions.map((question, index) => {
                  const exam = exams.find((item) => item.id === question.examId);
                  const topicNames = (question.topicIds ?? []).map((id) => topics.find((topic) => topic.id === id)?.name).filter(Boolean);
                  return <tr key={question.id} className="qb-question-row">
                    <td><button type="button" className="qb-question-open" onClick={() => openEdit(question)}><span className="qb-row-index">{String(index + 1).padStart(2, '0')}</span><span className="qb-question-copy"><strong>{question.stem}</strong><small>{question.year ? `${question.year} · ` : ''}Version {question.version}{question.isSample ? ' · Sample' : ''}</small></span><ArrowUpRight size={15} className="qb-open-indicator" /></button></td>
                    <td><strong className="qb-exam-name">{exam?.shortName || exam?.name || 'Exam'}</strong><small className="qb-topic-label">{topicNames.length ? topicNames.join(' · ') : 'No topic assigned'}</small></td>
                    <td><span className="qb-type-label">{question.type.replace('_', ' ')}</span></td>
                    <td><span className={`qb-status qb-status-${question.status}`}>{question.status}</span></td>
                    <td className="qb-date">{dateLabel(question.lastReviewedAt)}</td>
                    <td><button type="button" className="qb-icon-button" aria-label={`Edit question: ${question.stem}`} onClick={() => openEdit(question)}><Pencil size={15} /></button></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {questionsQuery.data?.nextCursor && <div className="qb-pagination"><span>Showing {questions.length} questions</span><button className="qb-button qb-button-outline" type="button" onClick={() => setCursor(questionsQuery.data?.nextCursor ?? undefined)}>Load next page <ArrowDown size={15} /></button></div>}
          </>
        )}
        <footer className="qb-footer"><span>Question content stays in draft until moved through review.</span><span><i /> Secure editorial workspace</span></footer>
      </section>
    </main>

    {editor && <div className="qb-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setEditor(null); }}>
      <section className="qb-editor" role="dialog" aria-modal="true" aria-labelledby="qb-editor-title">
        <header className="qb-editor-head">
          <div><span className="qb-editor-kicker">{openedQuestion ? `QUESTION ${openedQuestion.id.slice(0, 8).toUpperCase()} · V${openedQuestion.version}` : 'NEW QUESTION · DRAFT'}</span><h2 id="qb-editor-title">{openedQuestion ? 'Review and edit' : 'Build a question'}</h2><p>Keep the clinical rationale and source trail close to the answer.</p></div>
          <button className="qb-icon-button qb-close" type="button" aria-label="Close editor" onClick={() => setEditor(null)}><X size={19} /></button>
        </header>
        {openedQuestion && <div className="qb-record-strip"><span className={`qb-status qb-status-${openedQuestion.status}`}>{openedQuestion.status}</span><span>Updated {dateLabel(openedQuestion.updatedAt)}</span><span>Last reviewed {dateLabel(openedQuestion.lastReviewedAt)}</span>{openedQuestion.reviewerId && <span>Reviewer {openedQuestion.reviewerId.slice(0, 8)}</span>}</div>}
        <form className="qb-form" onSubmit={(event) => void saveQuestion(event)}>
          <section className="qb-form-section">
            <div className="qb-section-heading"><span>01</span><div><h3>Clinical scenario</h3><p>Stem, answer prompt and exam context</p></div></div>
            <div className="qb-field-pair">
              <label className="qb-field">Exam<select required value={editor.values.examId} onChange={(event) => updateValues({ examId: event.target.value, topicIds: [] })}><option value="">Select exam</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.shortName || exam.name}</option>)}</select></label>
              <label className="qb-field">Question format<select value={editor.values.type ?? 'sba'} onChange={(event) => changeType(event.target.value as AdminQuestionType)}>{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            </div>
            <label className="qb-field">Question stem<textarea required rows={4} value={editor.values.stem} onChange={(event) => updateValues({ stem: event.target.value })} placeholder="Write the clinical vignette and relevant findings…" /></label>
            <label className="qb-field">Lead-in <span className="qb-optional">Optional</span><textarea rows={2} value={editor.values.leadIn ?? ''} onChange={(event) => updateValues({ leadIn: event.target.value })} placeholder="For example: What is the most appropriate next step?" /></label>
          </section>

          <section className="qb-form-section">
            <div className="qb-section-heading"><span>02</span><div><h3>Answer options</h3><p>{editor.values.type === 'multi_select' ? 'Select every correct answer.' : 'Select the single best answer.'} Add 2–6 options.</p></div><span className="qb-option-count">{editor.values.options.length}/6</span></div>
            <div className="qb-options">{editor.values.options.map((option, index) => <article className={`qb-option ${option.isCorrect ? 'is-correct' : ''}`} key={`${index}-${option.label}`}>
              <div className="qb-option-head"><span className="qb-option-letter">{alphabet[index]}</span><label className="qb-correct-toggle"><input type={editor.values.type === 'multi_select' ? 'checkbox' : 'radio'} name="correct-option" checked={option.isCorrect} onChange={() => {
                if (editor.values.type === 'multi_select') updateOption(index, { isCorrect: !option.isCorrect });
                else setEditor((current) => current ? { ...current, values: { ...current.values, options: current.values.options.map((entry, optionIndex) => ({ ...entry, isCorrect: optionIndex === index })) } } : current);
              }} /><span>{option.isCorrect ? 'Correct answer' : 'Mark correct'}</span></label>
                <button type="button" className="qb-remove-option" disabled={editor.values.options.length <= 2} onClick={() => removeOption(index)} aria-label={`Remove option ${alphabet[index]}`}><X size={14} /></button></div>
              <label className="qb-field"><span className="sr-only">Option {alphabet[index]} text</span><textarea rows={2} required value={option.text} onChange={(event) => updateOption(index, { text: event.target.value })} placeholder={`Answer option ${alphabet[index]}`} /></label>
              <label className="qb-field qb-rationale">Option rationale <span className="qb-optional">Optional</span><textarea rows={2} value={option.rationale ?? ''} onChange={(event) => updateOption(index, { rationale: event.target.value })} placeholder="Explain why this option is or is not appropriate…" /></label>
            </article>)}</div>
            <button type="button" className="qb-add-option" disabled={editor.values.options.length >= 6} onClick={addOption}><Plus size={15} /> Add answer option</button>
          </section>

          <section className="qb-form-section">
            <div className="qb-section-heading"><span>03</span><div><h3>Clinical explanation</h3><p>Make the reasoning transparent and defensible.</p></div></div>
            <label className="qb-field">Explanation<textarea rows={4} value={editor.values.explanation ?? ''} onChange={(event) => updateValues({ explanation: event.target.value })} placeholder="Explain the clinical reasoning behind the correct answer…" /></label>
            <label className="qb-field">Key point <span className="qb-optional">Optional</span><textarea rows={2} value={editor.values.keyPoint ?? ''} onChange={(event) => updateValues({ keyPoint: event.target.value })} placeholder="One concise takeaway for the learner" /></label>
          </section>

          <section className="qb-form-section">
            <div className="qb-section-heading"><span>04</span><div><h3>References</h3><p>Source materials reviewers can verify.</p></div></div>
            {(editor.values.references ?? []).map((reference, index) => <div className="qb-reference-row" key={index}>
              <label className="qb-field">Reference title<input value={reference.title} onChange={(event) => updateReference(index, { title: event.target.value })} placeholder="Guideline, paper or textbook" /></label>
              <label className="qb-field">URL<input type="url" value={reference.url ?? ''} onChange={(event) => updateReference(index, { url: event.target.value })} placeholder="https://" /></label>
              <button type="button" className="qb-remove-reference" aria-label="Remove reference" onClick={() => removeReference(index)}><X size={15} /></button>
            </div>)}
            <button type="button" className="qb-add-option" onClick={addReference}><Plus size={15} /> Add reference</button>
          </section>

          <section className="qb-form-section">
            <div className="qb-section-heading"><span>05</span><div><h3>Classification & provenance</h3><p>Help maintain a well-indexed and auditable bank.</p></div></div>
            <div className="qb-field-pair qb-field-triple">
              <label className="qb-field">Difficulty<select value={editor.values.difficultyId ?? ''} onChange={(event) => updateValues({ difficultyId: event.target.value })}><option value="">Not set</option>{difficulties.map((level) => <option value={level.id} key={level.id}>{level.name}</option>)}</select></label>
              <label className="qb-field">Year<input type="number" min="1900" max="2100" value={editor.values.year ?? ''} onChange={(event) => updateValues({ year: event.target.value ? Number(event.target.value) : null })} placeholder="Year" /></label>
              <label className="qb-field">Source label<input value={editor.values.sourceLabel ?? ''} onChange={(event) => updateValues({ sourceLabel: event.target.value })} placeholder="e.g. Paper 2" /></label>
            </div>
            <label className="qb-sample-toggle"><input type="checkbox" checked={editor.values.isSample ?? false} onChange={(event) => updateValues({ isSample: event.target.checked })} /><span><strong>Sample question</strong><small>Mark this item for sample access.</small></span></label>
            <div className="qb-taxonomy-block"><strong>Topics</strong><small>Choose the closest syllabus areas.</small>{editor.values.examId ? editorTopicsQuery.isLoading ? <div className="qb-taxonomy-loading">Loading exam topics…</div> : editorTopicsQuery.isError ? <p className="qb-taxonomy-loading">Topics could not be loaded.</p> : <div className="qb-check-grid">{(editorTopicsQuery.data ?? []).map((topic) => <label key={topic.id}><input type="checkbox" checked={(editor.values.topicIds ?? []).includes(topic.id)} onChange={() => toggleId('topicIds', topic.id)} /><span>{topic.name}</span></label>)}</div> : <div className="qb-taxonomy-loading">Select an exam to view its topics.</div>}</div>
            <label className="qb-field">Tag IDs <span className="qb-optional">Optional</span><input value={(editor.values.tagIds ?? []).join(', ')} onChange={(event) => updateValues({ tagIds: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} placeholder="Paste existing tag IDs, separated by commas" /><small>Uses existing tags only; no new tags are created here.</small></label>
            <label className="qb-field">Change note <span className="qb-optional">Optional</span><input value={editor.values.changeNote ?? ''} onChange={(event) => updateValues({ changeNote: event.target.value })} placeholder="Briefly describe this revision" /></label>
          </section>

          {saveError && <div className="qb-error qb-form-error" role="alert">{saveError}<button type="button" onClick={() => setSaveError('')}>Dismiss</button></div>}
          {statusError && <div className="qb-error qb-form-error" role="alert">{statusError}<button type="button" onClick={() => setStatusError('')}>Dismiss</button></div>}
          <div className="qb-editor-actions">
            {openedQuestion && <button type="button" className="qb-button qb-button-danger-quiet" disabled={deleteQuestion.isPending} onClick={() => void removeQuestion(openedQuestion)}><Trash2 size={15} /> {deleteQuestion.isPending ? 'Removing…' : 'Delete'}</button>}
            <span className="qb-editor-state"><i /> Saved as {openedQuestion?.status ?? 'draft'} only when submitted</span>
            <button type="button" className="qb-button qb-button-outline" onClick={() => setEditor(null)}>Cancel</button>
            <button type="submit" className="qb-button qb-button-primary" disabled={saving}>{saving ? 'Saving…' : openedQuestion ? 'Save changes' : 'Create draft'}</button>
          </div>
          {openedQuestion && <div className="qb-workflow">
            <div><ShieldCheck size={17} /><span><strong>Review workflow</strong><small>Change status separately from editing. A status update is recorded in the audit trail.</small></span></div>
            {openedQuestion.status === 'draft' && <button type="button" className="qb-button qb-button-review" disabled={changeStatus.isPending} onClick={() => void transition(openedQuestion, 'review')}>{changeStatus.isPending ? 'Updating…' : 'Send to review'} <ArrowUpRight size={15} /></button>}
            {openedQuestion.status === 'review' && <><label className="qb-review-note">Reviewer note<input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Optional decision context" /></label><button type="button" className="qb-button qb-button-review" disabled={changeStatus.isPending} onClick={() => void transition(openedQuestion, 'approved')}>{changeStatus.isPending ? 'Updating…' : 'Approve question'} <Check size={15} /></button></>}
            {openedQuestion.status === 'approved' && <button type="button" className="qb-button qb-button-review" disabled={changeStatus.isPending} onClick={() => void transition(openedQuestion, 'published')}>{changeStatus.isPending ? 'Updating…' : 'Publish question'} <ExternalLink size={14} /></button>}
            {openedQuestion.status === 'published' && <button type="button" className="qb-button qb-button-outline" disabled={changeStatus.isPending} onClick={() => void transition(openedQuestion, 'archived')}>{changeStatus.isPending ? 'Updating…' : 'Archive question'}</button>}
            {openedQuestion.status === 'archived' && <button type="button" className="qb-button qb-button-outline" disabled={changeStatus.isPending} onClick={() => void transition(openedQuestion, 'draft')}>Return to draft</button>}
            {(openedQuestion.status === 'review' || openedQuestion.status === 'approved') && <button type="button" className="qb-button qb-button-outline" disabled={changeStatus.isPending} onClick={() => void transition(openedQuestion, 'draft')}>Return to draft</button>}
          </div>}
        </form>
      </section>
    </div>}
  </AdminLayout>;
}
