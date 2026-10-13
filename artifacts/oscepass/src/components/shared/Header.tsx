import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useListExams } from '@workspace/api-client-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { brand } from '@/config/brand';
import { useAuth } from '@/features/auth/AuthProvider';
import { examsMenuExtras, primaryNav, resourcesMenu, type NavItem, type NavLink } from '@/config/navigation';
import { Brand } from './Brand';

type MenuKey = NonNullable<NavItem['menu']>;

function useMenuLinks(): Record<MenuKey, NavLink[]> {
  const { data } = useListExams();
  const examLinks: NavLink[] = (data?.items ?? []).map((e) => ({ label: e.name, href: `/exams/${e.slug}`, description: e.format }));
  return { exams: [...examLinks, ...examsMenuExtras], resources: resourcesMenu };
}

function isActive(location: string, href: string) {
  return href === '/' ? location === '/' : location === href || location.startsWith(`${href}/`);
}

export function Header() {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggers = useRef<Partial<Record<MenuKey, HTMLButtonElement | null>>>({});
  const baseId = useId();
  const links = useMenuLinks();

  useEffect(() => {
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [location]);

  // Close on outside click and on Escape (returning focus to the trigger, per the WAI-ARIA disclosure pattern).
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        triggers.current[openMenu]?.focus();
        setOpenMenu(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  function focusFirstLink(menu: MenuKey) {
    requestAnimationFrame(() => document.getElementById(`${baseId}-${menu}`)?.querySelector<HTMLAnchorElement>('a')?.focus());
  }

  return <header className="site-header">
    <div className="container header-inner">
      <Brand />
      <nav className="nav-links" aria-label="Main navigation" ref={navRef}>
        <ul className="nav-list">
          {primaryNav.map((item) => {
            const menu = item.menu;
            if (!menu) {
              return <li key={item.href}><Link href={item.href} aria-current={isActive(location, item.href) ? 'page' : undefined}>{item.label}</Link></li>;
            }
            const panelId = `${baseId}-${menu}`;
            const open = openMenu === menu;
            return <li key={item.href} className="nav-item-mega" onBlur={(event) => { if (open && !event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null); }}>
              <button
                type="button"
                className="nav-trigger"
                aria-expanded={open}
                aria-controls={panelId}
                ref={(node) => { triggers.current[menu] = node; }}
                onClick={() => setOpenMenu(open ? null : menu)}
                onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpenMenu(menu); focusFirstLink(menu); } }}
                data-active={isActive(location, item.href) || undefined}
              >
                {item.label}<ChevronDown size={14} aria-hidden="true" />
              </button>
              <div id={panelId} className="mega-panel" hidden={!open}>
                <ul>
                  {links[menu].map((link) => <li key={link.href + link.label}><Link href={link.href}><strong>{link.label}</strong>{link.description && <span>{link.description}</span>}</Link></li>)}
                </ul>
              </div>
            </li>;
          })}
        </ul>
      </nav>
      <div className="nav-actions">
        {user ? <>
          <Link href="/app" className="btn btn-primary">Dashboard</Link>
          <button type="button" className="btn btn-ghost" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
        </> : <>
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">Start free</Link>
        </>}
      </div>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <button className="menu-toggle" type="button" aria-label="Open navigation" data-testid="button-mobile-menu"><Menu size={24} aria-hidden="true" /></button>
        </SheetTrigger>
        <SheetContent side="right" className="mobile-drawer">
          <SheetTitle className="sr-only">{brand.name} navigation</SheetTitle>
          <SheetDescription className="sr-only">Site pages and account links</SheetDescription>
          <nav aria-label="Mobile navigation">
            <Accordion type="single" collapsible>
              {primaryNav.map((item) => item.menu
                ? <AccordionItem key={item.href} value={item.href} className="drawer-group">
                    <AccordionTrigger className="drawer-link">{item.label}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="drawer-sub">{links[item.menu].map((link) => <li key={link.href + link.label}><Link href={link.href}>{link.label}</Link></li>)}</ul>
                    </AccordionContent>
                  </AccordionItem>
                : <Link key={item.href} href={item.href} className="drawer-link drawer-plain" aria-current={isActive(location, item.href) ? 'page' : undefined}>{item.label}</Link>)}
            </Accordion>
            <div className="drawer-actions">
              {user ? <>
                <Link href="/app" className="btn btn-primary">Dashboard</Link>
                <button type="button" className="btn btn-light" onClick={async () => { await signOut(); navigate('/'); }}>Sign out</button>
              </> : <>
                <Link href="/login" className="btn btn-light">Sign in</Link>
                <Link href="/signup" className="btn btn-primary">Start free</Link>
              </>}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  </header>;
}
