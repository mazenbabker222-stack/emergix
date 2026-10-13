import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Link } from 'wouter';
import { PageHero } from '@/components/shared/PageHero';
import { Reveal } from '@/components/shared/Reveal';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { stations } from '@/features/neurology/data';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Practice() {
  usePageMeta('OSCE practice cases', 'Search and browse practical MRCEM OSCE stations for emergency medicine.');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All topics');
  const categories = ['All topics', ...Array.from(new Set(stations.map((station) => station.category)))];
  const shown = stations.filter((station) => (category === 'All topics' || station.category === category) && `${station.title} ${station.category} ${station.detail}`.toLowerCase().includes(query.toLowerCase()));
  return <SiteLayout><main><PageHero eyebrow="OSCE practice cases" title="Practise the cases. Find your structure." intro="Search the station catalogue and choose a case to open its learning material and timed practice." />
    <section className="section"><div className="container">
      <div className="catalog-controls"><label className="search-field"><Search size={18} /><span className="sr-only">Search practice cases</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stations or topics" data-testid="input-practice-search" /></label><label><span className="sr-only">Filter by topic</span><select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} data-testid="select-practice-topic">{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <p style={{ color: '#60758d', fontSize: '.84rem', margin: '0 0 18px' }} aria-live="polite">{shown.length} {shown.length === 1 ? 'station' : 'stations'} available</p>
      <div className="case-grid">{shown.length ? shown.map((station) => <Reveal key={station.slug}><Link className="case-card" href={`/neurology/${station.slug}`}><div className="case-thumb"><img src={station.image} alt="" /><span className="case-type">{station.category}</span></div><div className="case-content"><h3>{station.title}</h3><p>{station.detail}</p><span className="case-link">Open station <ArrowRight size={14} /></span></div></Link></Reveal>) : <div className="catalog-empty"><Search size={24} /><h3>No stations match that search</h3><p>Try another term or choose “All topics”.</p><button className="btn btn-light" onClick={() => { setQuery(''); setCategory('All topics'); }}>Clear filters</button></div>}</div>
    </div></section></main></SiteLayout>;
}
