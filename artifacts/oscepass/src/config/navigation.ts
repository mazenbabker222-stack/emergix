export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavItem extends NavLink {
  /** Which mega-menu panel opens from this item. */
  menu?: 'exams' | 'resources';
}

/**
 * Header navigation (docs/PLATFORM_PLAN.md 5.1).
 * TODO(phase 05): Question Bank -> /question-bank. TODO(phase 06): OSCE Stations -> /osce-stations.
 * Until those pages exist the links point at the closest working pages.
 */
export const primaryNav: NavItem[] = [
  { label: 'Exams', href: '/exams', menu: 'exams' },
  { label: 'Courses', href: '/courses' },
  { label: 'Question Bank', href: '/practice' },
  { label: 'OSCE Stations', href: '/osce-stations' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '/resources', menu: 'resources' },
  { label: 'About', href: '/about' },
  { label: 'Help', href: '/help' },
];

export const examsMenuExtras: NavLink[] = [
  { label: 'Compare all exams', href: '/exams', description: 'Format, length and structure side by side' },
  { label: 'Exam calendar and fees', href: '/calendar', description: 'Dates, fees and calendar export' },
];

export const resourcesMenu: NavLink[] = [
  { label: 'Study resources', href: '/resources', description: 'Guides and reference material' },
  { label: 'Blog and news', href: '/blog', description: 'Study tips and platform updates' },
  { label: 'Free demo', href: '/free-demo', description: 'Sample questions and a lesson, no account' },
];

export const legalLinks: NavLink[] = [
  { label: 'Terms of use', href: '/legal/terms' },
  { label: 'Privacy policy', href: '/legal/privacy' },
  { label: 'Cookie policy', href: '/legal/cookies' },
  { label: 'Refund policy', href: '/legal/refunds' },
  { label: 'Medical disclaimer', href: '/legal/medical-disclaimer' },
];
