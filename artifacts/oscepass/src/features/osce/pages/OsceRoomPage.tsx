import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { phaseAt } from '@workspace/osce-core';
import {
  getGetOsceRoomMarksQueryKey,
  getGetOsceRoomQueryKey,
  useApplyOsceRoomAction,
  useCreateOsceRoomAttempt,
  useGetOsceRoom,
  useGetOsceRoomMarks,
  useGetOsceStation,
  useJoinOsceRoom,
  useSaveOsceRoomMarks,
  type OsceRoomState,
} from '@workspace/api-client-react';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { usePageMeta } from '@/lib/usePageMeta';
import NotFound from '@/pages/not-found';
import { CandidateExamSections, CandidateInstructions, ExaminerSections } from '../components/StationContent';
import { MarkingSheet } from '../components/MarkingSheet';
import { PhaseTimer } from '../components/PhaseTimer';
import { apiMessage } from '../lib/errors';
import { useServerElapsed } from '../lib/useClock';
import { useAutosavedMarking } from '../lib/useMarking';
import '../osce.css';

/**
 * Partner room. State comes from the server; changes are pushed over Server-Sent Events and the
 * query also refetches every 8 seconds as a fallback (proxies sometimes buffer event streams).
 */
export default function OsceRoomPage() {
  const { code = '' } = useParams<{ code: string }>();
  const qc = useQueryClient();
  usePageMeta('Partner room', 'Practise an OSCE station with a partner: one candidate, one examiner, one shared clock.');
  const room = useGetOsceRoom(code, { query: { queryKey: getGetOsceRoomQueryKey(code), refetchInterval: 8000 } });
  const join = useJoinOsceRoom();

  useEffect(() => {
    if (!code || typeof EventSource === 'undefined') return;
    const source = new EventSource(`/api/osce/rooms/${encodeURIComponent(code)}/events`);
    source.addEventListener('state', (event) => {
      try {
        qc.setQueryData(getGetOsceRoomQueryKey(code), JSON.parse((event as MessageEvent<string>).data) as OsceRoomState);
      } catch {
        /* ignore a malformed event; the next one or the poll corrects it */
      }
    });
    return () => source.close();
  }, [code, qc]);

  const s = room.data;
  if (room.isError) return <NotFound />;
  if (room.isLoading || !s) return <SiteLayout><main className="container osce-page"><Skeleton className="h-64 w-full" /></main></SiteLayout>;

  async function onJoin() {
    try {
      const next = await join.mutateAsync({ code, data: {} });
      qc.setQueryData(getGetOsceRoomQueryKey(code), next);
    } catch (err) {
      toast({ title: 'Could not join the room', description: apiMessage(err), variant: 'destructive' });
    }
  }

  const freeRole = !s.candidateJoined ? 'candidate' : !s.examinerJoined ? 'examiner' : null;
  return (
    <SiteLayout>
      <main className="container osce-page">
        <p><Link href="/app/osce">← All stations</Link></p>
        <h1>Partner room: {s.stationTitle}</h1>
        {s.yourRole === null ? (
          <div className="osce-state">
            {freeRole ? (
              <>
                <h2>You have been invited</h2>
                <p>Join as the {freeRole}. The other person is the {freeRole === 'candidate' ? 'examiner' : 'candidate'}.</p>
                <button type="button" className="btn btn-primary" onClick={() => void onJoin()} disabled={join.isPending} data-testid="room-join">Join as {freeRole}</button>
              </>
            ) : (
              <><h2>This room is full</h2><p>It already has a candidate and an examiner. Ask your partner to create a new room.</p></>
            )}
          </div>
        ) : (
          <RoomBody state={s} code={code} />
        )}
      </main>
    </SiteLayout>
  );
}

function RoomBody({ state, code }: { state: OsceRoomState; code: string }) {
  const qc = useQueryClient();
  const station = useGetOsceStation(state.stationSlug);
  const act = useApplyOsceRoomAction();
  const role = state.yourRole!;
  const running = state.clockStatus === 'running';
  const roomQuery = qc.getQueryState(getGetOsceRoomQueryKey(code));
  const elapsed = useServerElapsed(state.elapsedSeconds, roomQuery?.dataUpdatedAt ?? Date.now(), running);
  const phase = useMemo(() => phaseAt(state.timing, elapsed), [state.timing, elapsed]);
  const bothJoined = state.candidateJoined && state.examinerJoined;
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/app/osce/room/${code}`;
  const [copied, setCopied] = useState(false);

  async function send(action: 'start' | 'pause' | 'resume' | 'skip' | 'reset') {
    try {
      const next = await act.mutateAsync({ code, data: { action } });
      qc.setQueryData(getGetOsceRoomQueryKey(code), next);
    } catch (err) {
      toast({ title: 'Could not change the clock', description: apiMessage(err), variant: 'destructive' });
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Select the link and copy it manually.' });
    }
  }

  return (
    <>
      <p className="osce-chips-line">You are the <strong data-testid="room-role">{role}</strong>. Candidate: {state.candidateJoined ? 'joined' : 'waiting'}. Examiner: {state.examinerJoined ? 'joined' : 'waiting'}.</p>
      {!bothJoined && (
        <div className="osce-field">
          <label htmlFor="room-link">Share this link with your partner</label>
          <div className="osce-actions"><input id="room-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} /><button type="button" className="btn btn-ghost" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy link'}</button></div>
        </div>
      )}

      <div className="osce-card-static">
        {state.clockStatus === 'lobby'
          ? <p className="osce-timer-phase">Ready to start</p>
          : <PhaseTimer state={phase} running={running} />}
        <div className="osce-actions osce-center">
          {state.clockStatus === 'lobby' && <button type="button" className="btn btn-primary" disabled={!bothJoined || act.isPending} onClick={() => void send('start')} data-testid="room-start">Start</button>}
          {state.clockStatus === 'running' && <button type="button" className="btn btn-primary" onClick={() => void send('pause')}>Pause</button>}
          {state.clockStatus === 'paused' && <button type="button" className="btn btn-primary" onClick={() => void send('resume')}>Resume</button>}
          {(state.clockStatus === 'running' || state.clockStatus === 'paused') && <button type="button" className="btn btn-ghost" onClick={() => void send('skip')}>Next phase</button>}
          {state.clockStatus !== 'lobby' && <button type="button" className="btn btn-ghost" onClick={() => void send('reset')}>Reset</button>}
        </div>
        {state.clockStatus === 'lobby' && !bothJoined && <p className="osce-muted osce-center">The clock can start once both of you have joined.</p>}
      </div>

      {!station.data ? <Skeleton className="h-32 w-full" /> : role === 'candidate' ? (
        <>
          <CandidateInstructions content={station.data.content} />
          {phase.phase === 'examiner' || phase.phase === 'finished' ? <CandidateExamSections content={station.data.content} timing={station.data.timing} /> : null}
        </>
      ) : (
        <ExaminerPanel code={code} stationSlug={state.stationSlug} />
      )}
    </>
  );
}

function ExaminerPanel({ code, stationSlug }: { code: string; stationSlug: string }) {
  const qc = useQueryClient();
  const station = useGetOsceStation(stationSlug);
  const draft = useGetOsceRoomMarks(code);
  const saveDraft = useSaveOsceRoomMarks();
  const saveAttempt = useCreateOsceRoomAttempt();
  const marking = useAutosavedMarking({ ready: draft.isSuccess, initial: draft.data?.attempt, save: (input) => saveDraft.mutateAsync({ code, data: input }) });
  if (!station.data) return <Skeleton className="h-32 w-full" />;
  const s = station.data;

  async function onSave() {
    try {
      await marking.flush(marking.state);
      await saveAttempt.mutateAsync({ code, data: { marks: marking.state.marks, globalRating: marking.state.globalRating, notes: marking.state.notes || null } });
      marking.reset();
      qc.setQueryData(getGetOsceRoomMarksQueryKey(code), {});
      toast({ title: 'Attempt saved' });
    } catch (err) {
      toast({ title: 'Could not save the attempt', description: apiMessage(err), variant: 'destructive' });
    }
  }

  return (
    <>
      <CandidateInstructions content={s.content} />
      <section className="osce-section-static" aria-labelledby="room-marking"><h2 id="room-marking">Examiner marking sheet</h2>
        <MarkingSheet domains={s.domains} state={marking.state} onChange={marking.update} onSave={() => void onSave()} status={marking.statusText} /></section>
      <ExaminerSections content={s.content} />
    </>
  );
}
