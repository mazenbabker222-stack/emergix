import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useListBlogPosts, type BlogPostSummary } from '@workspace/api-client-react';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { PageHero } from '@/components/shared/PageHero';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { formatLongDate } from '@/lib/format';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Blog() {
  usePageMeta('Blog and news', 'Study tips, exam updates and platform news for emergency medicine doctors.');
  const [cursor, setCursor] = useState<string | undefined>();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const { data, isLoading, isError, isFetching, refetch } = useListBlogPosts({ limit: 9, ...(cursor ? { cursor } : {}) });
  useEffect(() => {
    if (!data) return;
    setPosts((prev) => [...prev, ...data.items.filter((p) => !prev.some((x) => x.slug === p.slug))]);
  }, [data]);
  return <SiteLayout><main>
    <PageHero eyebrow="Blog" title="Study tips and news." intro="Practical advice for your exam preparation." />
    <section className="section"><div className="container">
      {isLoading && <PageSkeleton rows={3} label="Loading posts" />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {data && posts.length === 0 && <EmptyState title="No posts yet" text="Check back soon." />}
      <div className="content-grid">{posts.map((p) => <article key={p.slug} className="content-card blog-card">
        <p className="muted"><time dateTime={p.publishedAt}>{formatLongDate(p.publishedAt)}</time></p>
        <h2><Link href={`/blog/${p.slug}`}>{p.title}</Link></h2>
        <p>{p.excerpt}</p>
        {p.tags.length > 0 && <ul className="tag-list">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>}
      </article>)}</div>
      {data?.nextCursor && <div className="center"><button type="button" className="btn btn-light" disabled={isFetching} onClick={() => setCursor(data.nextCursor ?? undefined)}>{isFetching ? 'Loading…' : 'Load more'}</button></div>}
    </div></section>
  </main></SiteLayout>;
}
