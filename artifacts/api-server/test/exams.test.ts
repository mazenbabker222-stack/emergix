import { db } from '@workspace/db';
import { EXPECTED_COUNTS, runSeed, seedCounts } from '@workspace/db/seed';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { describeDb, loadApp, ORIGIN } from './helpers';

// Needs DATABASE_URL_TEST with the schema pushed (see test/setup.ts). The seed is idempotent, so it is safe to run here.
describeDb('public site API (phase 04, needs DATABASE_URL_TEST)', () => {
  let app: Express;
  beforeAll(async () => {
    await runSeed(db);
    app = await loadApp();
  });

  it('seeds the expected number of rows, twice, without duplicates', async () => {
    await runSeed(db);
    expect(await seedCounts(db)).toEqual(EXPECTED_COUNTS);
  });

  it('lists the 3 seeded exams in order with derived facts', async () => {
    const res = await request(app).get('/api/exams');
    expect(res.status).toBe(200);
    expect(res.headers.etag).toBeTruthy();
    expect(res.body.items.map((e: { slug: string }) => e.slug)).toEqual(['mrcem-primary', 'mrcem-sba', 'mrcem-osce']);
    const sba = res.body.items[1];
    expect(sba).toMatchObject({ totalQuestions: 180, totalMinutes: 240, breakMinutes: 60 });
  });

  it('returns an exam with sections, FAQs, dates and documents', async () => {
    const res = await request(app).get('/api/exams/mrcem-sba');
    expect(res.status).toBe(200);
    expect(res.body.sections).toHaveLength(2);
    expect(res.body.sections[0].notes).toMatch(/60 minutes break/);
    expect(res.body.faqs.length).toBeGreaterThan(0);
    expect(res.body.dates.length).toBeGreaterThan(0);
    expect(res.body.dates[0].feeMinor).toBe(10000);
    expect(res.body.documents[0].url).toMatch(/^https:/);
  });

  it('describes the OSCE circuit as stations plus rest stations', async () => {
    const res = await request(app).get('/api/exams/mrcem-osce');
    expect(res.body.sections.map((s: { itemCount: number }) => s.itemCount)).toEqual([16, 2]);
  });

  it('answers 404 in the standard error shape', async () => {
    const res = await request(app).get('/api/exams/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    const unknown = await request(app).get('/api/nope');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('not_found');
  });

  it('filters FAQs and treats LIKE wildcards literally', async () => {
    const general = await request(app).get('/api/faqs').query({ category: 'pricing' });
    expect(general.body.items.every((f: { category: string }) => f.category === 'pricing')).toBe(true);
    const wild = await request(app).get('/api/faqs').query({ q: '%' });
    expect(wild.status).toBe(200);
    expect(wild.body.items.every((f: { question: string; answer: string }) => (f.question + f.answer).includes('%'))).toBe(true);
  });

  it('groups plans by family with a duration per price', async () => {
    const res = await request(app).get('/api/plans');
    const all = res.body.items.find((p: { slug: string }) => p.slug === 'all-access');
    expect(all.isFeatured).toBe(true);
    expect(all.prices.map((p: { intervalMonths: number }) => p.intervalMonths)).toEqual([1, 3, 6, 12]);
    expect(new Set(all.prices.map((p: { currency: string }) => p.currency))).toEqual(new Set(['GBP']));
  });

  it('serves banners, CMS pages, blog and the sitemap', async () => {
    expect((await request(app).get('/api/banners')).body.items.length).toBeGreaterThan(0);
    const terms = await request(app).get('/api/pages/terms');
    expect(terms.body.needsReview).toBe(true);
    const blog = await request(app).get('/api/blog').query({ limit: 2 });
    expect(blog.body.items).toHaveLength(2);
    expect(blog.body.nextCursor).toBeTruthy();
    const next = await request(app).get('/api/blog').query({ limit: 2, cursor: blog.body.nextCursor });
    expect(next.body.items).toHaveLength(1);
    const sitemap = await request(app).get('/api/sitemap.xml');
    expect(sitemap.headers['content-type']).toMatch(/xml/);
    expect(sitemap.text).toContain('/exams/mrcem-osce');
  });

  it('stores contact messages, ignores the honeypot and validates input', async () => {
    const ok = await request(app)
      .post('/api/contact')
      .set('Origin', ORIGIN)
      .send({ name: 'Test', email: 'contact@example.test', subject: 'Billing', message: 'A message that is long enough.' });
    expect(ok.status).toBe(201);
    expect(ok.body).toEqual({ ok: true });
    const bot = await request(app)
      .post('/api/contact')
      .set('Origin', ORIGIN)
      .send({ name: 'Bot', email: 'bot@example.test', message: 'Spam spam spam spam.', website: 'http://spam.example' });
    expect(bot.status).toBe(201);
    const bad = await request(app).post('/api/contact').set('Origin', ORIGIN).send({ name: '', email: 'nope', message: 'short' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('validation_error');
  });
});
