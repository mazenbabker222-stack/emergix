import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Brand } from '@/components/shared/Brand';
import { Footer } from '@/components/shared/Footer';
import { useAuth } from '@/features/auth/AuthProvider';

export interface ShellNavItem {
  href: string;
  label: string;
}

/** Signed-in chrome shared by the learner area and the admin area. */
export function ShellLayout({ nav, area, children }: { nav: ShellNavItem[]; area: string; children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [location, navigate] = useLocation();
  return (
    <>
      <header className="site-header shell-header">
        <div className="container header-inner">
          <Brand />
          <nav className="nav-links" aria-label={`${area} navigation`}>
            {nav.map((item) => (
              <Link key={item.href} href={item.href} aria-current={location === item.href || (item.href !== '/app' && location.startsWith(`${item.href}/`)) ? 'page' : undefined}>{item.label}</Link>
            ))}
          </nav>
          <div className="nav-actions">
            <span className="shell-user" title={user?.email}>{user?.name}</span>
            <button type="button" className="btn btn-ghost" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="shell-main container" id="main">{children}</main>
      <Footer />
    </>
  );
}
