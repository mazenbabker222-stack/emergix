import { ArrowRight, Brain, ClipboardCheck, FileText, GraduationCap, Stethoscope, Video } from 'lucide-react';
import { Link } from 'wouter';
import { PageHero } from '@/components/shared/PageHero';
import { Reveal } from '@/components/shared/Reveal';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Courses() {
  usePageMeta('Courses', 'Discover emergency medicine and MRCEM OSCE courses, with focused learning and practice pathways.');
  const courseCards = [
    { icon: Brain, tag: 'Featured pathway', title: 'MRCEM Neurology', description: 'Explore neurology topics and ready-to-practise OSCE stations for emergency medicine.', href: '/neurology', meta: 'Topics, cases and examiner guidance' },
    { icon: Stethoscope, tag: 'OSCE pathway', title: 'Common Presentations in A&E', description: 'History, examination and management of common A&E presentations.', href: '/practice', meta: 'Clinical structure and case practice' },
    { icon: ClipboardCheck, tag: 'Practice library', title: 'OSCE Practice Cases', description: 'Interactive stations with AI examiner and detailed feedback.', href: '/practice', meta: 'Case catalogue' },
    { icon: FileText, tag: 'Study resources', title: 'Clinical Guidelines', description: 'Links to NICE, SIGN and latest evidence-based guidelines.', href: '/resources', meta: 'Reading and literature' },
    { icon: Video, tag: 'Live teaching', title: 'Live Teaching Sessions', description: '1-to-1 or group sessions with expert examiners.', href: '/contact', meta: '1-to-1 or group sessions' },
    { icon: GraduationCap, tag: 'Learning support', title: 'Progress & Feedback', description: 'Detailed reports, marking and personalised improvement tips.', href: '/signup', meta: 'Student access' },
  ];
  return <SiteLayout><main><PageHero eyebrow="Explore our modules" title="Find the right next step for your preparation." intro="Choose a focused pathway, build your clinical approach and practise the stations that matter to your exam." />
    <section className="section"><div className="container"><div className="content-grid">{courseCards.map(({ icon: Icon, tag, title, description, href, meta }) => <Reveal key={title}><article className="content-card"><span className="icon-tile"><Icon size={21} /></span><p className="eyebrow" style={{ margin: '17px 0 0', fontSize: '.65rem' }}>{tag}</p><h3>{title}</h3><p>{description}</p><p style={{ fontSize: '.75rem', color: '#74869a' }}>{meta}</p><Link className="btn btn-light" href={href}>Explore <ArrowRight size={14} /></Link></article></Reveal>)}</div></div></section>
  </main></SiteLayout>;
}
