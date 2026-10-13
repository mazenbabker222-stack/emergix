import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { PageHero } from '@/components/shared/PageHero';
import { Reveal } from '@/components/shared/Reveal';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { brand } from '@/config/brand';
import { usePageMeta } from '@/lib/usePageMeta';

export default function About() {
  usePageMeta(`About ${brand.name}`, `Learn about ${brand.name} and its practical emergency medicine OSCE preparation approach.`);
  return <SiteLayout><main><PageHero eyebrow={`About ${brand.name}`} title="Preparation made practical." intro={`${brand.name} brings realistic emergency medicine cases, expert guidance and structured practice into one learning experience.`} />
    <section className="section"><div className="container quote-layout"><Reveal><div><span className="eyebrow">The learning approach</span><h2 style={{ color: 'var(--navy)', fontSize: '2.6rem', lineHeight: 1.1, letterSpacing: '-.05em' }}>Make the clinical reasoning visible.</h2><p style={{ color: '#5e7187', lineHeight: 1.8 }}>{brand.name} is built for learners preparing for A&amp;E and MRCEM OSCEs. It connects teaching, relevant reading and realistic cases with a chance to practise the communication and decision-making the station asks of you.</p><p style={{ color: '#5e7187', lineHeight: 1.8 }}>Our aim is a calmer, more deliberate preparation process: understand the task, find a safe structure, and communicate your plan clearly.</p><Link className="btn btn-primary" href="/courses">Explore learning modules <ArrowRight size={16} /></Link></div></Reveal>
      <Reveal><div className="course-card"><span className="course-label">LEARN • PRACTISE • PASS</span><h3>Real A&amp;E cases. Expert guidance. AI practice.</h3><p>Prepare for the station, not just the syllabus.</p><div className="course-meta"><span><CheckCircle2 size={15} /> Case-based learning</span><span><CheckCircle2 size={15} /> Examiner perspective</span><span><CheckCircle2 size={15} /> Progress and feedback</span></div></div></Reveal></div></section>
  </main></SiteLayout>;
}
