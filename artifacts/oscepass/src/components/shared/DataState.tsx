import { AlertTriangle, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/** aria-busy lets screen readers (and the prerender script) know content is still loading. */
export function PageSkeleton({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="container section" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-10 w-2/3 mb-6" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-24 w-full mb-4" />)}
    </div>
  );
}

export function ErrorState({ title = 'We could not load this page', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="state-box" role="alert">
      <AlertTriangle size={26} aria-hidden="true" />
      <h2>{title}</h2>
      <p>Please check your connection and try again. If the problem continues, contact us.</p>
      {onRetry && <button className="btn btn-primary" type="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="state-box">
      <Inbox size={26} aria-hidden="true" />
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
