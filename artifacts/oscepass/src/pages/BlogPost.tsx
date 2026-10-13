import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { ApiError, useGetBlogPost } from '@workspace/api-client-react';
import { ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { Prose } from '@/components/shared/Prose';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { formatLongDate } from '@/lib/format';
import { articleJsonLd } from '@/lib/schema';
import { useJsonLd, usePageMeta } from '@/lib/usePageMeta';
import NotFound from './not-found';

export default function BlogPost() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: post, isLoading, error, refetch } = useGetBlogPost(slug);
  const notFound = error instanceof ApiError && error.status === 404;
  usePageMeta(post?.seoTitle ?? post?.title ?? 'Blog', post?.seoDescription ?? post?.excerpt ?? 'Blog post', { type: 'article', noindex: notFound, image: post?.coverImageUrl ?? undefined });
  const ld = useMemo(() => (post ? articleJsonLd({ title: post.title, description: post.excerpt, path: `/blog/${post.slug}`, author: post.authorName, publishedAt: post.publishedAt }) : null), [post]);
  useJsonLd('article', ld);
  if (notFound) return <NotFound />;
  return <SiteLayout><main className="container section article">
    <Link href="/blog" className="back-link"><ArrowLeft size={16} aria-hidden="true" />All posts</Link>
    {isLoading && <PageSkeleton rows={3} label="Loading post" />}
    {error && <ErrorState onRetry={() => void refetch()} />}
    {post && <article>
      <h1>{post.title}</h1>
      <p className="muted">{post.authorName} · <time dateTime={post.publishedAt}>{formatLongDate(post.publishedAt)}</time></p>
      <Prose text={post.body} />
    </article>}
  </main></SiteLayout>;
}
