import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link, useSearch } from 'wouter';
import {
  useListOsceStations,
  useListOsceTopics,
  type ListOsceStationsParams,
  type OsceDifficulty,
  type OsceStationStatus,
} from '@workspace/api-client-react';
import { PageHero } from '@/components/shared/PageHero';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { brand } from '@/config/brand';
import { usePageMeta } from '@/lib/usePageMeta';
import '../osce.css';

const DIFFICULTY_LABEL: Record<string, string> = { foundation: 'Foundation', core: 'Core', advanced: 'Advanced' };

/** Station library. `area="public"` is the marketing preview, `area="app"` the learner area. */
export default function OsceLibrary({ area }: { area: 'public' | 'app' }) {
  usePageMeta('OSCE stations', 'Browse MRCEM OSCE stations by specialty and topic, then practise with timers, marking and circuits.');
  const search = useSearch();
  const initialTopic = new URLSearchParams(search).get('topic') ?? '';
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState<OsceDifficulty | ''>('');
  const [status, setStatus] = useState<OsceStationStatus | ''>('');

  const params = useMemo<ListOsceStationsParams>(
    () => ({ ...(q.trim() ? { q: q.trim() } : {}), ...(topic ? { topic } : {}), ...(difficulty ? { difficulty } : {}), ...(status ? { status } : {}), limit: 100 }),
    [q, topic, difficulty, status],
  );
  const stations = useListOsceStations(params);
  const topics = useListOsceTopics();
  const base = area === 'app' ? '/app/osce' : '/osce-stations';
  const items = stations.data?.items ?? [];

  return (
    <SiteLayout>
      <main>
        <PageHero eyebrow="OSCE stations" title="Practise the stations. Find your structure." intro="Browse by specialty and topic. Ready stations include timers, an examiner marking sheet and model answers; the rest of the curriculum is on its way." />
        <section className="section">
          <div className="container">
            <form className="osce-filters" role="search" onSubmit={(e) => e.preventDefault()}>
              <label className="osce-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search stations</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stations or topics" data-testid="osce-search" /></label>
              <label><span className="sr-only">Specialty or topic</span>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="osce-topic">
                  <option value="">All topics</option>
                  {(topics.data?.specialties ?? []).map((sp) => (
                    <optgroup key={sp.slug} label={sp.name}>
                      <option value={sp.slug}>{sp.name}: all ({sp.total})</option>
                      {sp.groups.map((g) => <option key={g.slug} value={g.slug}>{g.name} ({g.total})</option>)}
                    </optgroup>
                  ))}
                </select></label>
              <label><span className="sr-only">Difficulty</span>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as OsceDifficulty | '')}>
                  <option value="">Any difficulty</option><option value="foundation">Foundation</option><option value="core">Core</option><option value="advanced">Advanced</option>
                </select></label>
              <label><span className="sr-only">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as OsceStationStatus | '')}>
                  <option value="">Ready and coming soon</option><option value="ready">Ready to practise</option><option value="coming_soon">Coming soon</option>
                </select></label>
            </form>
            {area === 'app' && <p className="osce-actions"><Link href="/app/osce/circuit/new" className="btn btn-primary">Build a circuit</Link></p>}
            <p className="osce-muted" aria-live="polite">{stations.isSuccess ? `${stations.data.total} ${stations.data.total === 1 ? 'station' : 'stations'}` : ' '}</p>

            {stations.isLoading && <div className="osce-grid" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>}
            {stations.isError && <div className="osce-state" role="alert"><h3>We could not load the stations</h3><p>Check your connection and try again.</p><button type="button" className="btn btn-primary" onClick={() => void stations.refetch()}>Try again</button></div>}
            {stations.isSuccess && items.length === 0 && <div className="osce-state"><h3>No stations match your search</h3><p>Try another term, or clear the filters.</p></div>}
            {stations.isSuccess && items.length > 0 && (
              <ul className="osce-grid" data-testid="osce-grid">
                {items.map((s) => {
                  const ready = s.status === 'ready';
                  const inner = (
                    <>
                      <span className={`osce-badge ${ready ? 'is-ready' : 'is-soon'}`}>{ready ? 'Ready' : 'Coming soon'}</span>
                      <h3>{s.title}</h3>
                      <p className="osce-muted">{s.topicGroup}{ready && ` · ${DIFFICULTY_LABEL[s.difficulty]} · ${s.totalMarks} marks`}</p>
                      {s.summary && <p>{s.summary}</p>}
                    </>
                  );
                  return <li key={s.id} className={`osce-card${ready ? '' : ' is-disabled'}`}>{ready ? <Link href={`${base}/${s.slug}`}>{inner}</Link> : <div aria-disabled="true">{inner}</div>}</li>;
                })}
              </ul>
            )}
            <p className="osce-muted osce-legal">{brand.legalDisclaimer}</p>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
