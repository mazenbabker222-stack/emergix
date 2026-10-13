import { Link } from 'wouter';
import { AppLayout } from '@/components/layouts/AppLayout';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Dashboard() {
  usePageMeta('Dashboard', 'Your learning dashboard.');
  const { user } = useAuth();
  return (
    <AppLayout>
      <h1>Welcome, {user?.name}.</h1>
      <p className="shell-lead">Build exam-ready judgement with SBA practice, OSCE rehearsal and a clear view of your progress.</p>
      {user && !user.emailVerified && <div className="form-alert" role="alert">Your e-mail address is not confirmed yet.</div>}
      {user?.deletionScheduledAt && (
        <div className="form-alert" role="alert">Your account is scheduled for deletion on {new Date(user.deletionScheduledAt).toLocaleDateString()}. <Link href="/app/account">Cancel deletion</Link></div>
      )}
      <div className="account-grid">
        <section className="account-section"><h2>MRCEM question bank</h2><p>Practise single-best-answer questions in Tutor, Timed or custom sessions.</p><Link className="btn btn-primary" href="/app/qbank">Open question bank</Link></section>
        <section className="account-section"><h2>Your progress</h2><p>Review daily practice, accuracy trends and topic performance.</p><Link className="btn btn-ghost" href="/app/analytics">View analytics</Link></section>
        <section className="account-section"><h2>Practice stations</h2><p>Work through the neurology OSCE stations.</p><Link className="btn btn-primary" href="/neurology">Open stations</Link></section>
        <section className="account-section"><h2>Your account</h2><p>Profile, security, devices and privacy.</p><Link className="btn btn-ghost" href="/app/account">Manage account</Link></section>
      </div>
    </AppLayout>
  );
}
