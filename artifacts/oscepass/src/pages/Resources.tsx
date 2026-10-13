import { ArrowRight, BookOpen, ClipboardCheck, FileText, Video } from 'lucide-react';
import { Link } from 'wouter';
import { PageHero } from '@/components/shared/PageHero';
import { Reveal } from '@/components/shared/Reveal';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Resources() {
  usePageMeta('Student resources', 'Teaching videos, reading and literature, clinical guidelines and study resources for A&E OSCE preparation.');
  const resources = [
    { icon: BookOpen, title: 'Reading & Literature', text: 'Key guidelines, articles and study materials before you practise.', label: 'Study materials', href: '/neurology' },
    { icon: FileText, title: 'Clinical Guidelines', text: 'Links to NICE, SIGN and latest evidence-based guidelines.', label: 'Guidance', href: '/neurology' },
    { icon: Video, title: 'Teaching Videos', text: 'Realistic A&E scenarios and expert-led teaching videos.', label: 'Video library', href: '/courses' },
    { icon: ClipboardCheck, title: 'OSCE checklists', text: 'Detailed reports, marking and personalised improvement tips.', label: 'Practice support', href: '/practice' },
  ];
  return <SiteLayout><main><PageHero eyebrow="Student resources" title="Good preparation begins before the station." intro="Browse reading, teaching and practice resources that help you build a clear clinical approach." />
    <section className="section"><div className="container"><div className="content-grid">{resources.map(({ icon: Icon, title, text, label, href }) => <Reveal key={title}><article className="content-card"><span className="icon-tile"><Icon size={21} /></span><p className="eyebrow" style={{ margin: '17px 0 0', fontSize: '.65rem' }}>{label}</p><h3>{title}</h3><p>{text}</p><Link className="btn btn-light" href={href}>Browse resources <ArrowRight size={14} /></Link></article></Reveal>)}</div>
      <div style={{ marginTop: 45, padding: '26px 28px', background: '#edf6ff', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}><div><span className="eyebrow">A focused place to start</span><h2 style={{ color: 'var(--navy)', margin: '11px 0 6px', fontSize: '1.5rem', letterSpacing: '-.04em' }}>MRCEM Neurology topics and OSCE stations</h2><p style={{ color: '#5c7086', margin: 0 }}>Open the topic hub for the ready-to-practise stations.</p></div><Link className="btn btn-primary" href="/neurology">Open neurology hub <ArrowRight size={15} /></Link></div>
    </div></section></main></SiteLayout>;
}
