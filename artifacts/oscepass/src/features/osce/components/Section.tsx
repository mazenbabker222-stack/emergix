import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Collapsible section built on <details> (keyboard and screen-reader friendly, no JS needed).
 * `openAll` is a counter-style signal from the page: true = expand, false = collapse, and the
 * section follows it whenever the value changes.
 */
export function Section({ title, children, defaultOpen = false, openAll }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; openAll?: { open: boolean; tick: number } }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (openAll && ref.current) ref.current.open = openAll.open;
  }, [openAll?.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <details ref={ref} className="osce-section" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="osce-section-body">{children}</div>
    </details>
  );
}
