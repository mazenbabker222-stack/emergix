import type { ReactNode } from 'react';
import { ShellLayout } from './ShellLayout';

export function AdminLayout({ children }: { children: ReactNode }) {
  return <ShellLayout area="Admin" nav={[{ href: '/admin', label: 'Courses' }, { href: '/admin/questions', label: 'Question bank' }, { href: '/app', label: 'Learner view' }]}>{children}</ShellLayout>;
}
