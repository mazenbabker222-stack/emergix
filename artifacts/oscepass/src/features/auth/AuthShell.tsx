import type { FormEventHandler, ReactNode } from 'react';
import { SiteLayout } from '@/components/shared/SiteLayout';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

/** Shared card layout for every public auth page. Renders a <form> when onSubmit is given. */
export function AuthShell({ eyebrow, title, intro, children, footer, onSubmit }: AuthShellProps) {
  const body = (
    <>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {intro && <p>{intro}</p>}
      {children}
      {footer && <p className="auth-bottom">{footer}</p>}
    </>
  );
  return (
    <SiteLayout>
      <main className="auth-wrap">
        {onSubmit ? <form className="auth-card" onSubmit={onSubmit} noValidate>{body}</form> : <div className="auth-card">{body}</div>}
      </main>
    </SiteLayout>
  );
}
