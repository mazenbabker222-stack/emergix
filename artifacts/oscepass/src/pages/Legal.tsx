import { useParams } from 'wouter';
import { ApiError, useGetPage } from '@workspace/api-client-react';
import { ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { Prose } from '@/components/shared/Prose';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { formatLongDate } from '@/lib/format';
import { usePageMeta } from '@/lib/usePageMeta';
import NotFound from './not-found';

const LEGAL_SLUGS = ['terms', 'privacy', 'cookies', 'refunds', 'medical-disclaimer'];

export default function Legal() {
  const { page: slug = '' } = useParams<{ page: string }>();
  const allowed = LEGAL_SLUGS.includes(slug);
  const { data, isLoading, error, refetch } = useGetPage(slug, { query: { enabled: allowed } as never });
  const notFound = !allowed || (error instanceof ApiError && error.status === 404);
  usePageMeta(data?.title ?? 'Legal', data?.description ?? 'Legal information', { noindex: notFound });
  if (notFound) return <NotFound />;
  return <SiteLayout><main className="container section article">
    {isLoading && <PageSkeleton rows={3} label="Loading page" />}
    {error && <ErrorState onRetry={() => void refetch()} />}
    {data && <article>
      <h1>{data.title}</h1>
      {data.needsReview && <div className="notice notice-warning" role="note">REVIEW BY LEGAL COUNSEL: placeholder text, not a final legal document.</div>}
      <p className="muted">Last updated {formatLongDate(data.updatedAt)}</p>
      <Prose text={data.body} />
    </article>}
  </main></SiteLayout>;
}
