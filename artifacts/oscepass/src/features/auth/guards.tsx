import type { ReactNode } from 'react';
import type { Permission } from '@workspace/auth-shared';
import { Link, Redirect, useLocation } from 'wouter';
import { safeNext } from '@/lib/auth-client-pure';
import { useAuth } from './AuthProvider';

function Loading() {
  return <div className="guard-loading" role="status" aria-live="polite">Loading…</div>;
}

/** Redirects anonymous visitors to /login?next=…; shows 403 when a permission is missing. */
export function RequireAuth({ children, permission }: { children: ReactNode; permission?: Permission }) {
  const { user, isPending, can } = useAuth();
  const [location] = useLocation();
  if (isPending) return <Loading />;
  if (!user) return <Redirect to={`/login?next=${encodeURIComponent(location)}`} replace />;
  if (permission && !can(permission)) return <Forbidden />;
  return <>{children}</>;
}

/** Login/sign-up pages bounce signed-in users to where they were going. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isPending } = useAuth();
  if (isPending) return <Loading />;
  if (user) {
    const next = safeNext(new URLSearchParams(window.location.search).get('next'));
    return <Redirect to={next} replace />;
  }
  return <>{children}</>;
}

export function Forbidden() {
  return (
    <main className="auth-wrap">
      <div className="auth-card" role="alert">
        <span className="eyebrow">403</span>
        <h1>You do not have access.</h1>
        <p>Your account does not have permission to view this page.</p>
        <Link href="/app" className="btn btn-primary">Back to dashboard</Link>
      </div>
    </main>
  );
}
