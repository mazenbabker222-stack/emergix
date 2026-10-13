import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { X } from 'lucide-react';
import { useListActiveBanners } from '@workspace/api-client-react';
import { safeGet, safeSet } from '@/lib/safeStorage';

const KEY = 'emergix-academy:dismissed-banners';

function readDismissed(): string[] {
  try {
    const parsed: unknown = JSON.parse(safeGet(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Dismissible announcement. Renders only after mount so prerendered HTML never contains a stale banner. */
export function AnnouncementBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { data } = useListActiveBanners();
  useEffect(() => {
    setDismissed(readDismissed());
    setMounted(true);
  }, []);
  const banner = data?.items.find((b) => !dismissed.includes(b.id));
  if (!mounted || !banner) return null;

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    safeSet(KEY, JSON.stringify(next));
  }

  const external = banner.linkUrl ? /^https?:\/\//.test(banner.linkUrl) : false;
  return (
    <aside className={`announcement announcement-${banner.variant}`} aria-label="Announcement" data-testid="announcement-banner">
      <div className="container announcement-inner">
        <p>
          {banner.message}{' '}
          {banner.linkUrl && banner.linkLabel && (external
            ? <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">{banner.linkLabel}</a>
            : <Link href={banner.linkUrl}>{banner.linkLabel}</Link>)}
        </p>
        <button type="button" className="announcement-close" onClick={() => dismiss(banner.id)} aria-label="Dismiss announcement">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
