import { Link } from 'wouter';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { usePageMeta } from '@/lib/usePageMeta';

export default function NotFound() {
  usePageMeta('Page not found', 'The page you were looking for could not be found.', { noindex: true });
  return <SiteLayout><main className="container section state-box">
    <h1>Page not found</h1>
    <p>The page you were looking for does not exist or has moved.</p>
    <div className="state-actions"><Link className="btn btn-primary" href="/">Go to the home page</Link><Link className="btn btn-light" href="/exams">Browse exams</Link></div>
  </main></SiteLayout>;
}
