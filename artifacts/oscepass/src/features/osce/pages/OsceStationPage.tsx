import { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { phaseAt } from '@workspace/osce-core';
import {
  getGetOsceDraftQueryKey,
  getListOsceAttemptsQueryKey,
  useClearOsceDraft,
  useCreateOsceStationAttempt,
  useCreateOsceRoom,
  useDeleteOsceAttempt,
  useGetOsceDraft,
  useGetOsceStation,
  useListOsceAttempts,
  useSaveOsceDraft,
} from '@workspace/api-client-react';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { brand } from '@/config/brand';
import { usePageMeta } from '@/lib/usePageMeta';
import NotFound from '@/pages/not-found';
import { CandidateExamSections, CandidateInstructions, ExaminerSections, LearningSections } from '../components/StationContent';
import { MarkingSheet } from '../components/MarkingSheet';
import { PhaseTimer } from '../components/PhaseTimer';
import { setSoundEnabled, soundEnabled } from '../lib/audio';
import { apiMessage } from '../lib/errors';
import { useAutosavedMarking } from '../lib/useMarking';
import { useStopwatch } from '../lib/useClock';
import '../osce.css';

type Mode = 'learning' | 'exam';
type View = 'candidate' | 'examiner';

/** Station viewer: Learning / Exam mode, Candidate / Examiner view, timers, marking, history. */
export default function OsceStationPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const initialMode = new URLSearchParams(search).get('mode') === 'exam' ? 'exam' : 'learning';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<View>('candidate');
  const [openAll, setOpenAll] = useState<{ open: boolean; tick: number }>({ open: false, tick: 0 });
  const [sound, setSound] = useState(soundEnabled());

  const station = useGetOsceStation(slug);
  const draft = useGetOsceDraft(slug);
  const history = useListOsceAttempts({ stationSlug: slug });
  const saveDraft = useSaveOsceDraft();
  const clearDraft = useClearOsceDraft();
  const saveAttempt = useCreateOsceStationAttempt();
  const deleteAttempt = useDeleteOsceAttempt();
  const createRoom = useCreateOsceRoom();
  const watch = useStopwatch();

  const marking = useAutosavedMarking({
    ready: draft.isSuccess,
    initial: draft.data?.attempt,
    mode,
    save: (input) => saveDraft.mutateAsync({ slug, data: input }),
  });

  const s = station.data;
  usePageMeta(s?.title ?? 'OSCE station', `${s?.title ?? 'OSCE station'}: MRCEM OSCE station for emergency medicine.`);
  const phase = useMemo(() => (s ? phaseAt(s.timing, watch.elapsed) : null), [s, watch.elapsed]);

  if (station.isError) return <NotFound />;
  if (station.isLoading || !s || !phase) return <SiteLayout><main className="container osce-page"><Skeleton className="h-72 w-full" /></main></SiteLayout>;

  const hasStarted = watch.elapsed > 0;
  const content = s.content;
  const refreshHistory = () => qc.invalidateQueries({ queryKey: getListOsceAttemptsQueryKey({ stationSlug: slug }) });

  async function onSave() {
    try {
      await marking.flush(marking.state);
      await saveAttempt.mutateAsync({ slug, data: { marks: marking.state.marks, globalRating: marking.state.globalRating, notes: marking.state.notes || null, mode } });
      marking.reset();
      qc.setQueryData(getGetOsceDraftQueryKey(slug), {});
      await refreshHistory();
      toast({ title: 'Attempt saved', description: 'It now appears in your self-assessment history.' });
    } catch (err) {
      toast({ title: 'Could not save the attempt', description: apiMessage(err), variant: 'destructive' });
    }
  }

  async function onClear() {
    marking.reset();
    try {
      await clearDraft.mutateAsync({ slug });
      qc.setQueryData(getGetOsceDraftQueryKey(slug), {});
    } catch (err) {
      toast({ title: 'Could not clear the marks', description: apiMessage(err), variant: 'destructive' });
    }
  }

  async function onPartner(role: 'candidate' | 'examiner') {
    try {
      const room = await createRoom.mutateAsync({ data: { stationSlug: slug, role } });
      navigate(`/app/osce/room/${room.code}`);
    } catch (err) {
      toast({ title: 'Could not create a room', description: apiMessage(err), variant: 'destructive' });
    }
  }

  return (
    <SiteLayout>
      <main className="container osce-page">
        <p><Link href="/app/osce">← All stations</Link></p>
        <h1>{s.title}</h1>
        <ul className="osce-chips" aria-label="Station details">
          <li>{s.topicGroup}</li><li>{Math.round(s.timing.historySeconds / 60)} min history</li>
          <li>{Math.round(s.timing.examinerSeconds / 60)} min examiner questions</li><li>{s.totalMarks} marks</li>
        </ul>

        <div className="osce-toolbar">
          <div className="osce-seg" role="group" aria-label="Mode">
            <button type="button" aria-pressed={mode === 'learning'} onClick={() => setMode('learning')} data-testid="mode-learning">Learning mode</button>
            <button type="button" aria-pressed={mode === 'exam'} onClick={() => setMode('exam')} data-testid="mode-exam">Exam mode</button>
          </div>
          <div className="osce-actions">
            <Link href={`/app/osce/${s.slug}/print?sheet=candidate`} className="btn btn-ghost">Print candidate sheet</Link>
            <Link href={`/app/osce/${s.slug}/print?sheet=examiner`} className="btn btn-ghost">Print examiner sheet</Link>
          </div>
        </div>

        {mode === 'learning' && (
          <>
            <div className="osce-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpenAll((o) => ({ open: true, tick: o.tick + 1 }))}>Expand all</button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpenAll((o) => ({ open: false, tick: o.tick + 1 }))}>Collapse all</button>
            </div>
            <CandidateInstructions content={content} />
            <LearningSections content={content} domains={s.domains} totalMarks={s.totalMarks} openAll={openAll} />
          </>
        )}

        {mode === 'exam' && (
          <>
            <CandidateInstructions content={content} />
            <div className="osce-seg" role="group" aria-label="View">
              <button type="button" aria-pressed={view === 'candidate'} onClick={() => setView('candidate')} data-testid="view-candidate">Candidate view</button>
              <button type="button" aria-pressed={view === 'examiner'} onClick={() => setView('examiner')} data-testid="view-examiner">Examiner view</button>
            </div>
            <div className="osce-card-static">
              <PhaseTimer state={phase} running={watch.running} />
              <div className="osce-actions osce-center">
                {watch.running
                  ? <button type="button" className="btn btn-primary" onClick={watch.pause} data-testid="timer-toggle">Pause</button>
                  : <button type="button" className="btn btn-primary" onClick={watch.start} disabled={phase.phase === 'finished'} data-testid="timer-toggle">{hasStarted ? 'Resume' : 'Start'}</button>}
                <button type="button" className="btn btn-ghost" onClick={watch.reset}>Reset</button>
                <label className="osce-check"><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); setSoundEnabled(e.target.checked); }} /> Sound cues</label>
              </div>
              <p className="osce-muted osce-center">Reading {Math.round(s.timing.readingSeconds / 60)} min, then history {Math.round(s.timing.historySeconds / 60)} min, then examiner questions {Math.round(s.timing.examinerSeconds / 60)} min. A warning shows in the last minute of each phase.</p>
            </div>

            {view === 'candidate' && <CandidateExamSections content={content} timing={s.timing} />}
            {view === 'examiner' && (
              <>
                <section className="osce-section-static" aria-labelledby="marking-heading">
                  <h2 id="marking-heading">Examiner marking sheet</h2>
                  <MarkingSheet domains={s.domains} state={marking.state} onChange={marking.update} onClear={() => void onClear()} onSave={() => void onSave()} status={marking.statusText} />
                </section>
                <ExaminerSections content={content} />
              </>
            )}

            <section className="osce-section-static">
              <h2>Practise with a partner</h2>
              <p>Create a room and share the link: one of you is the candidate, the other the examiner, with one shared clock.</p>
              <div className="osce-actions">
                <button type="button" className="btn btn-ghost" onClick={() => void onPartner('candidate')}>Create room as candidate</button>
                <button type="button" className="btn btn-ghost" onClick={() => void onPartner('examiner')}>Create room as examiner</button>
              </div>
            </section>
          </>
        )}

        <section className="osce-section-static" aria-labelledby="history-heading">
          <h2 id="history-heading">Your self-assessment history</h2>
          {history.isLoading && <Skeleton className="h-16 w-full" />}
          {history.isError && <p role="alert">We could not load your history.</p>}
          {history.isSuccess && history.data.items.length === 0 && <p className="osce-muted">No saved attempts yet. Mark a station in Exam mode (Examiner view) and choose Save attempt.</p>}
          {history.isSuccess && history.data.items.length > 0 && (
            <ul className="osce-history" data-testid="osce-history">
              {history.data.items.map((a) => (
                <li key={a.id}>
                  <span>{new Date(a.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <strong>{a.totalMarks} / {a.maxMarks}</strong>
                  <span>{a.globalRating ?? 'Not rated'}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => void deleteAttempt.mutateAsync({ id: a.id }).then(refreshHistory)} aria-label={`Delete attempt from ${new Date(a.createdAt).toLocaleDateString('en-GB')}`}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="osce-muted osce-legal">Fictional teaching case for exam practice. {brand.legalDisclaimer}</p>
      </main>
    </SiteLayout>
  );
}
