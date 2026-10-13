import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { formatClock, locateInSegments, MAX_CIRCUIT_STATIONS } from '@workspace/osce-core';
import {
  getGetOsceCircuitQueryKey,
  getGetOsceCircuitReportQueryKey,
  useCreateOsceCircuit,
  useFinishOsceCircuit,
  useGetOsceCircuit,
  useGetOsceCircuitReport,
  useGetOsceStation,
  useListOsceStations,
  useSaveOsceCircuitMarks,
  useStartOsceCircuit,
  type Phase06OsceAttempt,
  type OsceCircuitState,
} from '@workspace/api-client-react';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { usePageMeta } from '@/lib/usePageMeta';
import NotFound from '@/pages/not-found';
import { MarkingSheet } from '../components/MarkingSheet';
import { Blocks } from '../components/Rich';
import { apiCode, apiMessage } from '../lib/errors';
import { useServerElapsed } from '../lib/useClock';
import { useAutosavedMarking } from '../lib/useMarking';
import '../osce.css';

export default function OsceCircuitPage() {
  const { id = '' } = useParams<{ id: string }>();
  usePageMeta('OSCE circuit', 'Run a timed circuit of OSCE stations with a reading minute, rest stations and a final report.');
  return <SiteLayout><main className="container osce-page">{id === 'new' ? <CircuitBuilder /> : <CircuitRunner id={id} />}</main></SiteLayout>;
}

function CircuitBuilder() {
  const [, navigate] = useLocation();
  const stations = useListOsceStations({ status: 'ready', limit: 100 });
  const create = useCreateOsceCircuit();
  const [selected, setSelected] = useState<string[]>([]);
  const [rests, setRests] = useState(2);
  const [title, setTitle] = useState('');

  const toggle = (slug: string) => setSelected((cur) => (cur.includes(slug) ? cur.filter((x) => x !== slug) : cur.length >= MAX_CIRCUIT_STATIONS ? cur : [...cur, slug]));
  const total = selected.length * 9 + (selected.length > 1 ? rests * 8 : 0);

  async function submit() {
    try {
      const state = await create.mutateAsync({ data: { stationSlugs: selected, restCount: selected.length > 1 ? rests : 0, ...(title.trim() ? { title: title.trim() } : {}) } });
      navigate(`/app/osce/circuit/${state.circuit.id}`);
    } catch (err) {
      toast({ title: 'Could not create the circuit', description: apiMessage(err), variant: 'destructive' });
    }
  }

  return (
    <>
      <p><Link href="/app/osce">← All stations</Link></p>
      <h1>Build a circuit</h1>
      <p>Each station has a 1 minute reading period and 8 minutes at the station. Rest stations last 8 minutes. The clock runs on our server, so refreshing the page or switching device never changes the timing. Choose up to {MAX_CIRCUIT_STATIONS} stations.</p>
      {stations.isLoading && <Skeleton className="h-40 w-full" />}
      {stations.isError && <p role="alert">We could not load the stations.</p>}
      {stations.isSuccess && (
        <fieldset className="osce-fieldset">
          <legend>Stations ({selected.length} selected)</legend>
          {stations.data.items.map((s) => (
            <label key={s.id} className="osce-check"><input type="checkbox" checked={selected.includes(s.slug)} onChange={() => toggle(s.slug)} /> {s.title}</label>
          ))}
        </fieldset>
      )}
      <div className="osce-field"><label htmlFor="circuit-title">Name (optional)</label><input id="circuit-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="osce-field"><label htmlFor="circuit-rests">Rest stations</label>
        <select id="circuit-rests" value={rests} onChange={(e) => setRests(Number(e.target.value))} disabled={selected.length < 2}>{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
      <p className="osce-muted">Total time: about {total} minutes.</p>
      <button type="button" className="btn btn-primary" disabled={selected.length === 0 || create.isPending} onClick={() => void submit()} data-testid="circuit-create">Create circuit</button>
    </>
  );
}

function CircuitRunner({ id }: { id: string }) {
  const qc = useQueryClient();
  const start = useStartOsceCircuit();
  const finish = useFinishOsceCircuit();
  const q = useGetOsceCircuit(id, {
    query: {
      queryKey: getGetOsceCircuitQueryKey(id),
      // Re-anchor the local clock to the server regularly; the server is the only source of truth.
      refetchInterval: (query) => (query.state.data?.circuit.status === 'running' ? 5000 : false),
      refetchOnWindowFocus: true,
    },
  });
  const state = q.data;
  const running = state?.circuit.status === 'running';
  const elapsed = useServerElapsed(state?.elapsedSeconds, q.dataUpdatedAt, running);
  const circuit = state?.circuit;
  const loc = useMemo(() => (circuit ? locateInSegments(circuit.segments, circuit.totalSeconds, elapsed) : null), [circuit, elapsed]);
  const segment = circuit && loc ? circuit.segments[loc.index] : undefined;
  const showReport = !!circuit && (circuit.status === 'completed' || circuit.status === 'abandoned' || (running && loc?.finished === true));
  const report = useGetOsceCircuitReport(id, { query: { queryKey: getGetOsceCircuitReportQueryKey(id), enabled: showReport } });

  if (q.isError) return <NotFound />;
  if (q.isLoading || !state || !circuit || !loc) return <Skeleton className="h-72 w-full" />;

  async function act(fn: () => Promise<unknown>, failure: string) {
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: getGetOsceCircuitQueryKey(id) });
    } catch (err) {
      toast({ title: failure, description: apiMessage(err), variant: 'destructive' });
    }
  }

  const stationNumber = segment?.stationSlug ? circuit.segments.filter((s) => s.kind === 'station').findIndex((s) => s.stationSlug === segment.stationSlug) + 1 : null;
  const stationCount = circuit.segments.filter((s) => s.kind === 'station').length;
  const label = !running ? '' : loc.finished ? 'Circuit finished' : segment?.kind === 'rest' ? 'Rest station' : segment?.kind === 'reading' ? `Reading: ${segment.stationTitle}` : `Station ${stationNumber} of ${stationCount}: ${segment?.stationTitle}`;
  const progress = Math.min(100, Math.round((elapsed / circuit.totalSeconds) * 100));

  return (
    <>
      <p><Link href="/app/osce">← All stations</Link></p>
      <h1>{circuit.title}</h1>
      {circuit.status === 'planned' && (
        <>
          <p>{stationCount} stations, {Math.round(circuit.totalSeconds / 60)} minutes in total. Once started, the clock cannot be paused.</p>
          <ol className="osce-timeline">{circuit.segments.filter((s) => s.kind !== 'reading').map((s, i) => <li key={i}>{s.kind === 'rest' ? 'Rest station' : s.stationTitle} <span className="osce-muted">({Math.round(s.durationSeconds / 60)} min)</span></li>)}</ol>
          <button type="button" className="btn btn-primary" onClick={() => void act(() => start.mutateAsync({ id }), 'Could not start the circuit')} disabled={start.isPending} data-testid="circuit-start">Start circuit</button>
        </>
      )}

      {circuit.status !== 'planned' && (
        <div className="osce-card-static" aria-live="off">
          <p className="osce-timer-phase" data-testid="circuit-label">{circuit.status === 'abandoned' ? 'Circuit ended early' : label}</p>
          {running && !loc.finished && <div className="osce-timer-clock" role="timer" aria-label={`${formatClock(loc.segmentRemainingSeconds)} remaining in this part`}>{formatClock(loc.segmentRemainingSeconds)}</div>}
          <div className="osce-progress" role="progressbar" aria-label="Circuit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={circuit.status === 'running' ? progress : 100}><span style={{ width: `${circuit.status === 'running' ? progress : 100}%` }} /></div>
          {running && <p className="osce-muted">{formatClock(Math.max(0, circuit.totalSeconds - elapsed))} left in the circuit</p>}
          {running && <button type="button" className="btn btn-ghost" onClick={() => void act(() => finish.mutateAsync({ id }), 'Could not end the circuit')}>End circuit early</button>}
        </div>
      )}

      {running && segment?.stationSlug && !loc.finished && segment.kind !== 'rest' && <StationBrief slug={segment.stationSlug} />}
      {running && state.position && state.position.markingOpenFor.length > 0 && (
        <section className="osce-section-static" aria-labelledby="circuit-marking">
          <h2 id="circuit-marking">Mark your stations</h2>
          <p className="osce-muted">You can enter marks from the start of each station until one minute after it ends.</p>
          {state.position.markingOpenFor.map((slug) => <CircuitMarking key={slug} circuitId={id} slug={slug} attempts={state.attempts} />)}
        </section>
      )}

      {showReport && (
        <section className="osce-section-static" aria-labelledby="circuit-report" data-testid="circuit-report">
          <h2 id="circuit-report">Circuit report</h2>
          {report.isLoading && <Skeleton className="h-24 w-full" />}
          {report.isError && <p role="alert">We could not load the report.</p>}
          {report.isSuccess && (
            <>
              <p className="osce-total">Overall: {report.data.totalMarks} / {report.data.maxMarks} ({report.data.percentage}%)</p>
              <div className="osce-scroll" tabIndex={0} role="region" aria-label="Per-station scores">
                <table className="osce-table"><thead><tr><th scope="col">Station</th><th scope="col">Score</th><th scope="col">Global rating</th></tr></thead>
                  <tbody>{report.data.stations.map((s) => <tr key={s.stationSlug}><th scope="row">{s.stationTitle}</th><td>{s.marked ? `${s.totalMarks} / ${s.maxMarks} (${s.percentage}%)` : 'Not marked'}</td><td>{s.globalRating ?? 'Not rated'}</td></tr>)}</tbody></table>
              </div>
              <h3>By domain, across all stations</h3>
              <div className="osce-scroll" tabIndex={0} role="region" aria-label="Per-domain scores">
                <table className="osce-table"><thead><tr><th scope="col">Domain</th><th scope="col">Score</th></tr></thead>
                  <tbody>{report.data.domains.map((d) => <tr key={d.domain}><th scope="row">{d.domain}</th><td>{d.awarded} / {d.max} ({d.percentage}%)</td></tr>)}</tbody></table>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

function StationBrief({ slug }: { slug: string }) {
  const q = useGetOsceStation(slug);
  if (!q.data) return <Skeleton className="h-24 w-full" />;
  return <section className="osce-section-static"><h2>Candidate instructions</h2><Blocks blocks={q.data.content.candidateInstructions} /></section>;
}

function CircuitMarking({ circuitId, slug, attempts }: { circuitId: string; slug: string; attempts: OsceCircuitState['attempts'] }) {
  const qc = useQueryClient();
  const station = useGetOsceStation(slug);
  const save = useSaveOsceCircuitMarks();
  const initial: Phase06OsceAttempt | undefined = attempts.find((a) => a.stationSlug === slug);
  const marking = useAutosavedMarking({
    ready: true,
    initial,
    save: async (input) => {
      try {
        await save.mutateAsync({ id: circuitId, slug, data: input });
        void qc.invalidateQueries({ queryKey: getGetOsceCircuitReportQueryKey(circuitId) });
      } catch (err) {
        if (apiCode(err) === 'marking_window_closed') toast({ title: 'Marking window closed', description: apiMessage(err), variant: 'destructive' });
        throw err;
      }
    },
  });
  if (!station.data) return <Skeleton className="h-24 w-full" />;
  return (
    <div className="osce-subsection">
      <h3>{station.data.title}</h3>
      <MarkingSheet domains={station.data.domains} state={marking.state} onChange={marking.update} status={marking.statusText} />
    </div>
  );
}
