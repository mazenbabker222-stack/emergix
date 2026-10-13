import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { brand } from '@/config/brand';
import { stationFiles } from '@/features/neurology/data';
import { usePageMeta } from '@/lib/usePageMeta';
import NotFound from '@/pages/not-found';

export default function Station() {
  const params = useParams<{ station: string }>();
  const station = params.station ? stationFiles[params.station] : undefined;
  const frameRef = useRef<HTMLIFrameElement>(null);
  usePageMeta(station?.title ?? 'Neurology station', `${station?.title ?? 'MRCEM neurology'}: MRCEM OSCE station for emergency medicine.`);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let resizeFrame = 0;
    const syncHeight = () => {
      const content = frame.contentDocument;
      if (!content) return;
      const contentHeight = Math.max(content.documentElement.scrollHeight, content.body?.scrollHeight ?? 0);
      frame.style.height = `${Math.max(window.innerHeight - 76, contentHeight)}px`;
    };
    const scheduleHeightSync = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(syncHeight);
    };
    frame.addEventListener('load', scheduleHeightSync);
    window.addEventListener('resize', scheduleHeightSync);
    frame.contentDocument?.addEventListener('toggle', scheduleHeightSync, true);
    if (frame.contentDocument?.readyState === 'complete') scheduleHeightSync();
    return () => {
      frame.removeEventListener('load', scheduleHeightSync);
      window.removeEventListener('resize', syncHeight);
      frame.contentDocument?.removeEventListener('toggle', scheduleHeightSync, true);
      cancelAnimationFrame(resizeFrame);
    };
  }, [station?.file]);
  if (!station) return <NotFound />;
  return <div className="station-frame-shell">
    <div className="station-shell-head"><Link href="/neurology"><ArrowLeft size={16} /> MRCEM Neurology topics</Link><Link href="/practice">All practice cases <ArrowRight size={15} /></Link></div>
    <iframe ref={frameRef} className="station-frame" src={`/neurology/${station.file}`} title={`${station.title} MRCEM OSCE station learning content`} />
    <p className="station-disclaimer">{brand.legalDisclaimer}</p>
  </div>;
}
