import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Brain, Check, Clock3, Play, Stethoscope } from 'lucide-react';
import { Link } from 'wouter';
import { Reveal } from '@/components/shared/Reveal';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { VideoModal } from '@/components/shared/VideoModal';
import { brand } from '@/config/brand';
import { features, modules } from '@/features/home/data';
import { stations } from '@/features/neurology/data';
import { useListExams } from '@workspace/api-client-react';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Home() {
  usePageMeta('A&E / OSCE Training Platform', 'Real A&E cases, expert guidance and AI examiner practice to build your OSCE confidence.');
  const [videoOpen, setVideoOpen] = useState(false);
  const exams = useListExams();
  return <SiteLayout>
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">A&amp;E OSCE preparation, made practical</span>
            <h1>Your A&amp;E / OSCE Training <span>Platform</span></h1>
            <p>Real cases. Expert guidance. AI practice. Build your confidence and achieve your goals.</p>
            <div className="hero-actions"><Link className="btn btn-primary" href="/signup">Get Started <ArrowRight size={17} /></Link><button className="btn btn-light" onClick={() => setVideoOpen(true)} aria-haspopup="dialog"><Play size={16} /> Watch Demo</button></div>
            <div className="hero-proof"><div className="avatar-stack" aria-hidden="true"><span>AM</span><span>JT</span><span>SK</span><span>+ </span></div><span>Practical learning for emergency medicine trainees</span></div>
          </div>
          <div className="hero-art" aria-label="Emergency medicine team discussing a patient case">
            <div className="hero-photo-frame" />
            <img className="hero-photo" src="/brand/hero.jpg" alt="Emergency medicine team in a clinical teaching discussion" />
            <div className="floating-note"><span className="float-check"><Check size={19} /></span><span><strong>Practice with purpose</strong><small>Cases, coaching and feedback</small></span></div>
          </div>
        </div>
      </section>

      <section className="social-proof" aria-label={`${brand.name} at a glance`}>
        <div className="container proof-row"><div className="proof-label">A focused platform for emergency medicine learners</div><div className="proof-stat"><strong>Real</strong><small>A&amp;E cases</small></div><div className="proof-divider" /><div className="proof-stat"><strong>Expert</strong><small>examiner guidance</small></div><div className="proof-divider" /><div className="proof-stat"><strong>Flexible</strong><small>practice, your pace</small></div></div>
      </section>

      <section className="section feature-strip">
        <div className="container">
          <Reveal><div className="section-heading"><span className="eyebrow">Everything in one place</span><h2>Prepare for the station. Not just the syllabus.</h2><p>Build clinical structure and exam confidence with the resources, teaching and practice you need in one place.</p></div></Reveal>
          <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <Reveal key={title} className={`delay-${index}`}><article className="feature-card"><span className="icon-tile"><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article></Reveal>)}</div>
        </div>
      </section>

      {exams.data && exams.data.items.length > 0 && <section className="section" aria-labelledby="home-exams"><div className="container">
        <Reveal><div className="section-heading"><span className="eyebrow">Choose your exam</span><h2 id="home-exams">Prepare for the exam you are sitting.</h2></div></Reveal>
        <div className="exam-grid">{exams.data.items.map((e) => <Reveal key={e.id}><article className="exam-card"><span className="eyebrow">{e.examType}</span><h3><Link href={`/exams/${e.slug}`}>{e.name}</Link></h3><p>{e.summary}</p><Link className="module-more" href={`/exams/${e.slug}`}>View exam <ArrowRight size={14} aria-hidden="true" /></Link></article></Reveal>)}</div>
      </div></section>}

      <section className="section modules-section">
        <div className="container">
          <Reveal><div className="section-heading modules-heading"><div><span className="eyebrow">Your learning pathway</span><h2>Explore Our Modules</h2></div><Link className="link-all-courses" href="/courses">View All Courses <ArrowRight size={15} /></Link></div></Reveal>
          <div className="module-grid">{modules.map(({ icon: Icon, title, description, color, image, href }) => <Reveal key={title}><article className="module-card">
            <Link href={href} className="module-image-link" aria-label={`Explore ${title}`}><img src={image} alt={`${title} learning module`} loading="lazy" /><span className="module-icon" style={{ backgroundColor: color }}><Icon size={19} aria-hidden="true" /></span></Link>
            <div className="module-content"><h3>{title}</h3><p>{description}</p><Link className="module-more" href={href}>Learn More <ArrowRight size={14} /></Link></div>
          </article></Reveal>)}</div>
        </div>
      </section>

      <section className="section course-band">
        <div className="container course-showcase">
          <Reveal><div className="course-copy"><span className="eyebrow">Start with a specialty</span><h2>Make the next station feel familiar.</h2><p>Explore focused learning pathways and practice cases designed for emergency medicine OSCEs.</p><Link className="btn btn-primary" href="/courses">Browse courses <ArrowRight size={16} /></Link></div></Reveal>
          <Reveal><article className="course-card"><div className="course-card-top"><span className="course-label">FEATURED LEARNING PATHWAY</span><Brain size={26} color="#9acbff" /></div><h3>MRCEM Neurology</h3><p>Prepare for the neurology stations that matter, with practical cases and examiner-focused guidance.</p><div className="course-meta"><span><BookOpen size={15} /> Topic and station hub</span><span><Clock3 size={15} /> Self-paced learning</span></div><Link className="btn btn-light" href="/neurology">Explore neurology <ArrowUpRight size={16} /></Link></article></Reveal>
        </div>
      </section>

      <section className="section case-section">
        <div className="container">
          <Reveal><div className="section-heading"><span className="eyebrow">Learn by doing</span><h2>Walk into the exam with a plan.</h2><p>Practise the communication, clinical thinking and prioritisation that emergency medicine stations call for.</p></div></Reveal>
          <div className="case-grid">{stations.map((station) => <Reveal key={station.slug}><Link className="case-card" href={`/neurology/${station.slug}`}><div className="case-thumb"><img src={station.image} alt="" /><span className="case-type">Neurology OSCE</span></div><div className="case-content"><h3>{station.title}</h3><p>{station.detail}</p><span className="case-link">Open station <ArrowRight size={14} /></span></div></Link></Reveal>)}</div>
          <div style={{ textAlign: 'center', marginTop: 27 }}><Link className="btn btn-light" href="/practice">See all practice cases <ArrowRight size={15} /></Link></div>
        </div>
      </section>

      <section className="section how-section">
        <div className="container">
          <Reveal><div className="section-heading"><span className="eyebrow">A clear way forward</span><h2>Learn. Practise. Pass.</h2><p>Real A&amp;E cases, expert guidance and AI examiner practice to build your OSCE confidence.</p></div></Reveal>
          <div className="steps">
            {[['01', 'Learn the approach', 'Review focused teaching, key guidance and a reliable structure for the station.'], ['02', 'Practise the case', 'Work through realistic scenarios and develop your history-taking and decision-making.'], ['03', 'Build confidence', 'Use examiner feedback and progress tracking to keep improving.']].map(([number, title, text]) => <Reveal key={number}><article className="step"><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article></Reveal>)}
          </div>
        </div>
      </section>

      <section className="section quote-section">
        <div className="container quote-layout"><Reveal><div><span className="eyebrow">Made for the moment that counts</span><h2>Turn preparation into confident performance.</h2><p>From the first question to your final summary, build a thoughtful approach you can take into the room.</p></div></Reveal><Reveal><div className="quote-card"><blockquote>The goal isn’t to memorise a script. It’s to show clear thinking, safe priorities and patient-centred communication.</blockquote><div className="quote-person"><span className="icon-tile"><Stethoscope size={19} /></span><span><strong>The {brand.name} approach</strong><small>Learn • Practise • Pass</small></span></div></div></Reveal></div>
      </section>

      <section className="cta-section"><div className="container cta-panel"><div><h2>Your next station starts here.</h2><p>Explore the learning pathways and practice cases available on {brand.name}.</p></div><Link className="btn btn-primary" href="/signup">Get started <ArrowRight size={16} /></Link></div></section>
    </main>
    {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
  </SiteLayout>;
}
