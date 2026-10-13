import { Link, useParams } from 'wouter';
import { useGetOsceStationPreview } from '@workspace/api-client-react';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { brand } from '@/config/brand';
import { usePageMeta } from '@/lib/usePageMeta';
import NotFound from '@/pages/not-found';
import { Blocks } from '../components/Rich';
import '../osce.css';

/** Public preview: aim, candidate instructions and the marking domains. Practice lives in /app/osce. */
export default function OsceStationPreview() {
  const { slug = '' } = useParams<{ slug: string }>();
  const q = useGetOsceStationPreview(slug);
  usePageMeta(q.data?.title ?? 'OSCE station', q.data?.summary ?? 'MRCEM OSCE station preview.');
  if (q.isError) return <NotFound />;
  const s = q.data;
  return (
    <SiteLayout>
      <main className="container osce-page">
        <p><Link href="/osce-stations">← All stations</Link></p>
        {q.isLoading || !s ? <Skeleton className="h-64 w-full" /> : (
          <>
            <h1>{s.title}</h1>
            <p className="osce-muted">{s.topicGroup}{s.status === 'ready' && ` · ${s.totalMarks} marks · ${Math.round(s.timing.historySeconds / 60)} min history · ${Math.round(s.timing.examinerSeconds / 60)} min examiner questions`}</p>
            {s.status !== 'ready' ? (
              <div className="osce-state"><h2>Coming soon</h2><p>This station is being prepared. Ready stations are listed in the library.</p></div>
            ) : (
              <>
                <div className="osce-actions"><Link href={`/app/osce/${s.slug}`} className="btn btn-primary" data-testid="osce-practise">Practise this station</Link></div>
                <h2>Aim and learning outcomes</h2><Blocks blocks={s.aim} />
                <h2>Candidate instructions</h2><Blocks blocks={s.candidateInstructions} />
                <h2>How it is marked</h2>
                <ul>{s.domains.map((d) => <li key={d.domain}>{d.domain} <span className="osce-muted">({d.maxMarks})</span></li>)}</ul>
                <p className="osce-muted">Model answers, the examiner view and the marking sheet open when you practise.</p>
              </>
            )}
            <p className="osce-muted osce-legal">{brand.legalDisclaimer}</p>
          </>
        )}
      </main>
    </SiteLayout>
  );
}
