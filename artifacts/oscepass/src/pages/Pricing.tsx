import { useMemo, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { Link } from 'wouter';
import { useListExams, useListFaqs, useListPlans, type PublicPlan } from '@workspace/api-client-react';
import { ErrorState, PageSkeleton } from '@/components/shared/DataState';
import { PageHero } from '@/components/shared/PageHero';
import { SiteLayout } from '@/components/shared/SiteLayout';
import { FaqAccordion } from '@/features/exams/FaqAccordion';
import { PlaceholderBadge } from '@/features/exams/PlaceholderBadge';
import { formatMoney } from '@/lib/format';
import { faqPageJsonLd } from '@/lib/schema';
import { useJsonLd, usePageMeta } from '@/lib/usePageMeta';

function PlanCard({ plan }: { plan: PublicPlan }) {
  const [priceId, setPriceId] = useState(plan.prices[0]?.id ?? '');
  const price = plan.prices.find((p) => p.id === priceId) ?? plan.prices[0];
  const name = `duration-${plan.slug}`;
  return <article className={`plan-card${plan.isFeatured ? ' plan-featured' : ''}`}>
    {plan.isFeatured && <span className="plan-flag">Best value</span>}
    <h3>{plan.name}</h3>
    <p>{plan.description}</p>
    <p className="plan-price" aria-live="polite">{price ? formatMoney(price.amountMinor, price.currency) : '—'}{price && price.amountMinor > 0 && <small> / {price.label}</small>} {plan.isPlaceholder && <PlaceholderBadge label="Placeholder price" />}</p>
    {plan.prices.length > 1 && <fieldset className="plan-durations"><legend className="sr-only">Choose a duration for {plan.name}</legend>
      {plan.prices.map((p) => <label key={p.id}><input type="radio" name={name} value={p.id} checked={p.id === priceId} onChange={() => setPriceId(p.id)} /><span>{p.label}</span></label>)}
    </fieldset>}
    <ul className="plan-features">{plan.features.map((f) => <li key={f}><Check size={16} aria-hidden="true" />{f}</li>)}</ul>
    <Link className="btn btn-primary" href="/signup">{price?.amountMinor === 0 ? 'Start free' : `Choose ${plan.name}`}</Link>
  </article>;
}

export default function Pricing() {
  usePageMeta('Pricing', 'Simple plans for MRCEM Primary, SBA and OSCE preparation, with a free demo to start.');
  const [exam, setExam] = useState('');
  const plans = useListPlans();
  const exams = useListExams();
  const faqs = useListFaqs({ category: 'pricing' });
  const faqLd = useMemo(() => (faqs.data?.items.length ? faqPageJsonLd(faqs.data.items) : null), [faqs.data]);
  useJsonLd('faq', faqLd);

  const shown = (plans.data?.items ?? []).filter((p) => !exam || p.examSlug === null || p.examSlug === exam);
  const featureRows = useMemo(() => Array.from(new Set(shown.flatMap((p) => p.features))), [shown]);

  return <SiteLayout><main>
    <PageHero eyebrow="Pricing" title="Plans for every exam." intro="Start with the free demo, then pick the plan that matches the exam you are sitting." />
    <section className="section"><div className="container">
      <div className="notice" role="note">All prices below are PLACEHOLDERS until the owner confirms them. Checkout arrives with the billing release.</div>
      <div className="chip-row" role="group" aria-label="Filter plans by exam">
        <button type="button" className="chip" aria-pressed={exam === ''} onClick={() => setExam('')}>All</button>
        {exams.data?.items.map((e) => <button key={e.id} type="button" className="chip" aria-pressed={exam === e.slug} onClick={() => setExam(e.slug)}>{e.shortName}</button>)}
      </div>
      {plans.isLoading && <PageSkeleton rows={2} label="Loading plans" />}
      {plans.isError && <ErrorState onRetry={() => void plans.refetch()} />}
      <div className="plan-grid">{shown.map((p) => <PlanCard key={p.id} plan={p} />)}</div>
    </div></section>
    {shown.length > 0 && <section className="section compare-section" aria-labelledby="plan-compare"><div className="container">
      <div className="section-heading"><h2 id="plan-compare">Compare plans</h2></div>
      <div className="table-wrap" role="region" aria-labelledby="plan-compare" tabIndex={0}>
        <table className="data-table">
          <caption className="sr-only">Features included in each plan</caption>
          <thead><tr><td className="sr-only">Feature</td>{shown.map((p) => <th key={p.id} scope="col">{p.name}</th>)}</tr></thead>
          <tbody>{featureRows.map((f) => <tr key={f}><th scope="row">{f}</th>{shown.map((p) => <td key={p.id}>{p.features.includes(f) ? <><Check size={18} aria-hidden="true" /><span className="sr-only">Included</span></> : <><Minus size={18} aria-hidden="true" /><span className="sr-only">Not included</span></>}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div></section>}
    {faqs.data && faqs.data.items.length > 0 && <section className="section" aria-labelledby="pricing-faq"><div className="container faq-wrap">
      <div className="section-heading"><h2 id="pricing-faq">Pricing questions</h2></div>
      <FaqAccordion faqs={faqs.data.items} />
    </div></section>}
  </main></SiteLayout>;
}
