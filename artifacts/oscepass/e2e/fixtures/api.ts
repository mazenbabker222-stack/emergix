import type { Page, Route } from '@playwright/test';

/** Deterministic API stub so e2e tests need neither a database nor the API server. */
const exam = (n: number, slug: string, name: string, shortName: string, extra: object = {}) => ({
  id: `00000000-0000-0000-0000-00000000000${n}`, slug, name, shortName, examType: n === 3 ? 'Clinical exam (OSCE)' : 'Written exam (SBA)',
  summary: `${name} summary`, format: `${name} format`, totalQuestions: n === 3 ? null : 180, totalMinutes: n === 1 ? 180 : n === 2 ? 240 : 162,
  breakMinutes: n === 2 ? 60 : null, location: 'Test centre', sortOrder: n * 10, ...extra,
});
const exams = [exam(1, 'mrcem-primary', 'MRCEM Primary', 'Primary'), exam(2, 'mrcem-sba', 'MRCEM SBA', 'SBA'), exam(3, 'mrcem-osce', 'MRCEM OSCE', 'OSCE')];
const faq = (id: string, question: string, answer: string, examSlug: string | null = 'mrcem-primary', category = 'general') => ({ id, examSlug, category, question, answer, sortOrder: 0 });
const faqs = [faq('f1', 'Who can sit this exam?', 'Check the **official** page.'), faq('f2', 'How do I book?', 'Use the college link.')];
const dates = [
  { id: 'd1', examSlug: 'mrcem-primary', examName: 'MRCEM Primary', label: 'Sample sitting 1 (PLACEHOLDER)', startDate: '2027-02-10', endDate: null, location: null, applicationOpens: '2026-11-02', applicationCloses: '2027-01-08', feeMinor: 10000, feeCurrency: 'GBP', isPlaceholder: true, notes: null },
  { id: 'd2', examSlug: 'mrcem-osce', examName: 'MRCEM OSCE', label: 'Sample circuit 1 (PLACEHOLDER)', startDate: '2027-04-12', endDate: '2027-04-14', location: null, applicationOpens: null, applicationCloses: null, feeMinor: 10000, feeCurrency: 'GBP', isPlaceholder: true, notes: null },
];
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export async function mockApi(page: Page, options: { banner?: boolean } = {}) {
  const contacts: unknown[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace(/^.*\/api/, '');
    if (p === '/exams') return json(route, { items: exams });
    if (p.startsWith('/exams/')) {
      const slug = p.split('/')[2];
      const found = exams.find((e) => e.slug === slug);
      if (!found) return json(route, { error: { code: 'not_found', message: 'Exam not found' } }, 404);
      return json(route, { ...found, sections: [{ name: 'Single paper', itemCount: 180, itemLabel: 'SBA questions', minutes: 180, notes: null }], content: '## What it covers\n\nBasic sciences.', officialUrl: 'https://rcem.ac.uk/', lastReviewedAt: '2026-10-01T00:00:00Z', faqs, dates: dates.filter((d) => d.examSlug === slug), documents: [] });
    }
    if (p === '/exam-dates') { const e = url.searchParams.get('exam'); const items = dates.filter((d) => !e || d.examSlug === e); return json(route, { items, lastUpdated: '2026-10-05T12:00:00Z' }); }
    if (p === '/faqs') { const q = (url.searchParams.get('q') ?? '').toLowerCase(); return json(route, { items: faqs.filter((f) => !q || f.question.toLowerCase().includes(q)) }); }
    if (p.startsWith('/auth/')) return json(route, null);
    if (p === '/banners') return json(route, { items: options.banner ? [{ id: 'b1', message: 'Sample announcement', linkUrl: '/calendar', linkLabel: 'See calendar', variant: 'info' }] : [] });
    if (p === '/plans') return json(route, { items: [
      { id: 'p1', slug: 'free', name: 'Free', examSlug: null, description: 'Try it', features: ['Free demo questions'], isFeatured: false, isPlaceholder: true, prices: [{ id: 'pr0', label: 'Free', intervalMonths: 0, amountMinor: 0, currency: 'GBP' }] },
      { id: 'p2', slug: 'primary-pass', name: 'Primary Pass', examSlug: 'mrcem-primary', description: 'Primary', features: ['Free demo questions', 'Full Primary question bank'], isFeatured: false, isPlaceholder: true, prices: [{ id: 'pr1', label: '1 month', intervalMonths: 1, amountMinor: 1900, currency: 'GBP' }, { id: 'pr3', label: '3 months', intervalMonths: 3, amountMinor: 4900, currency: 'GBP' }] },
    ] });
    if (p === '/pages/free-demo') return json(route, { slug: 'free-demo', title: 'Free demo', description: '', body: '', needsReview: false, updatedAt: '2026-10-01T00:00:00Z', data: { questions: [{ id: 'q1', stem: 'Sample stem?', options: [{ key: 'A', text: 'Right', rationale: 'Because.' }, { key: 'B', text: 'Wrong', rationale: 'No.' }], correct: 'A', keyPoint: 'Key.' }], lesson: { title: 'Sample lesson', body: 'Body text.' } } });
    if (p === '/pages/terms') return json(route, { slug: 'terms', title: 'Terms of use', description: '', body: '## Using the service\n\nText.', needsReview: true, updatedAt: '2026-10-01T00:00:00Z', data: null });
    if (p === '/contact' && route.request().method() === 'POST') { contacts.push(route.request().postDataJSON()); return json(route, { ok: true }, 201); }
    return json(route, { error: { code: 'not_found', message: 'Not found' } }, 404);
  });
  return { contacts };
}
