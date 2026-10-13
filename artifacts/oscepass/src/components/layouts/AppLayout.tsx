import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { ShellLayout, type ShellNavItem } from './ShellLayout';

export function AppLayout({ children }: { children: ReactNode }) {
  const { can } = useAuth();
  const nav: ShellNavItem[] = [
    { href: '/app', label: 'Dashboard' },
    { href: '/app/qbank', label: 'Question bank' },
    { href: '/app/analytics', label: 'Analytics' },
    { href: '/app/osce', label: 'OSCE practice' },
    { href: '/neurology', label: 'Study library' },
    { href: '/app/account', label: 'Account' },
    ...(can('admin:access') ? [{ href: '/admin', label: 'Admin' }] : []),
  ];
  return <ShellLayout nav={nav} area="Learner">{children}</ShellLayout>;
}
