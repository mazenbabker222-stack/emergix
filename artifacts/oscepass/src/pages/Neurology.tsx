import { ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { Reveal } from '@/components/shared/Reveal';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { brand } from '@/config/brand';
import { stations, topicGroups } from '@/features/neurology/data';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Neurology() {
  usePageMeta('MRCEM Neurology', 'Neurology topics and OSCE stations for emergency medicine learners preparing for MRCEM.');
  return <SiteLayout><main><section className="neurology-hero"><div className="container"><span className="eyebrow" style={{ color: '#9bcaff' }}>MRCEM learning area</span><h1>Neurology for MRCEM.</h1><p>Topic list and OSCE stations for emergency medicine. Open a topic to explore its learning path, then practise a ready station.</p></div></section>
    <section className="section" style={{ background: '#f3f8ff' }}><div className="container neurology-layout"><div className="neurology-main"><Reveal><div className="section-heading"><span className="eyebrow">Topic list and stations</span><h2>Work through neurology, one station at a time.</h2><p>Ready: Stroke and TIA, Cauda equina syndrome, Subarachnoid haemorrhage, First seizure and Meningitis. Other topics will follow in the same format.</p></div></Reveal>
      {topicGroups.map((group) => <details className="topic-card" key={group.name}><summary>{group.name}</summary><div className="topic-card-body"><ul>{group.topics.map((topic) => {
        const ready = group.ready?.find((item) => item.title === topic);
        if (topic === 'Stroke and TIA') return <li key={topic}><Link href="/neurology/stroke-and-tia">Stroke and TIA, OSCE station</Link> <span>(ready)</span></li>;
        return <li key={topic}>{ready ? <><Link href={`/neurology/${ready.slug}`}>{ready.title}, OSCE station</Link> <span>(ready)</span></> : topic}</li>;
      })}</ul></div></details>)}
      <p style={{ color: '#697c90', fontSize: '.78rem', marginTop: 19 }}>Based on the RCEM curriculum and typical MRCEM content. Check the current RCEM syllabus.</p>
      <p style={{ color: '#697c90', fontSize: '.78rem', marginTop: 6 }}>{brand.legalDisclaimer}</p>
    </div><aside className="neurology-side"><h3>Ready-to-practise stations</h3>{stations.map((station) => <Link key={station.slug} href={`/neurology/${station.slug}`}>{station.title} <ChevronRight size={13} style={{ float: 'right' }} /></Link>)}<a href="/neurology/curriculum.html" style={{ display: 'block', color: '#0874d5', fontWeight: 700, borderBottom: '1px solid #edf2f8', padding: '11px 0', fontSize: '.81rem' }}>Open supplied full curriculum <ArrowUpRight size={14} style={{ verticalAlign: 'middle' }} /></a><Link href="/practice" style={{ color: '#0874d5', fontWeight: 700, border: 0, marginTop: 6 }}>All practice cases <ArrowRight size={13} style={{ verticalAlign: 'middle' }} /></Link></aside></div></section>
  </main></SiteLayout>;
}
