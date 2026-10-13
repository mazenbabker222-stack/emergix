import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/api';

test.beforeEach(async ({ page }) => {
  // Hide the cookie banner by default; the dedicated test clears this.
  await page.addInitScript(() => { if (!window.sessionStorage.getItem('keep-consent')) window.localStorage.setItem('emergix-academy:cookie-consent', 'essential'); });
});

test('exams page lists exams and compares them in Primary, SBA, OSCE order', async ({ page }) => {
  await mockApi(page);
  await page.goto('/exams');
  const headers = page.locator('table thead th[scope="col"]');
  await expect(headers).toHaveText(['MRCEM Primary', 'MRCEM SBA', 'MRCEM OSCE']);
  await expect(page.getByText('Not affiliated with or endorsed by the Royal College of Emergency Medicine.').first()).toBeVisible();
});

test('exam FAQ accordion works with the keyboard', async ({ page }) => {
  await mockApi(page);
  await page.goto('/exams/mrcem-primary');
  const second = page.getByRole('button', { name: 'How do I book?' });
  await expect(page.getByRole('button', { name: 'Who can sit this exam?' })).toHaveAttribute('aria-expanded', 'true');
  await second.focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('script[type="application/ld+json"]', { hasText: 'FAQPage' })).toHaveCount(1);
});

test('unknown exam shows the friendly 404', async ({ page }) => {
  await mockApi(page);
  await page.goto('/exams/nope');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('calendar filters by exam and exports .ics', async ({ page }) => {
  await mockApi(page);
  await page.goto('/calendar');
  await expect(page.getByText('2 sittings shown')).toBeVisible();
  await page.getByTestId('select-exam').selectOption('mrcem-osce');
  await expect(page.getByText('1 sitting shown')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Add MRCEM OSCE/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.ics$/);
  await expect(page.getByText('Last updated 5 October 2026.')).toBeVisible();
});

test('announcement banner can be dismissed and stays dismissed', async ({ page }) => {
  await mockApi(page, { banner: true });
  await page.goto('/');
  const banner = page.getByTestId('announcement-banner');
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Dismiss announcement' }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('announcement-banner')).toHaveCount(0);
});

test('cookie banner records the choice', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem('keep-consent', '1'));
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('emergix-academy:cookie-consent'));
  await page.reload();
  await page.getByRole('button', { name: 'Essential only' }).click();
  await expect(page.getByTestId('cookie-banner')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('emergix-academy:cookie-consent'))).toBe('essential');
});

test('pricing shows placeholder prices and switches duration', async ({ page }) => {
  await mockApi(page);
  await page.goto('/pricing');
  const card = page.locator('.plan-card', { hasText: 'Primary Pass' });
  await expect(card.getByText('£19')).toBeVisible();
  await card.getByText('3 months').click();
  await expect(card.getByText('£49')).toBeVisible();
  await expect(card.getByText('Placeholder price')).toBeVisible();
});

test('free demo reveals the answer and rationale', async ({ page }) => {
  await mockApi(page);
  await page.goto('/free-demo');
  await page.getByLabel(/Wrong/).check();
  await expect(page.getByText('Not quite: the answer is A')).toBeVisible();
  await expect(page.getByText('Answered 1 of 1 · 0 correct')).toBeVisible();
});

test('help search filters the FAQ', async ({ page }) => {
  await mockApi(page);
  await page.goto('/help');
  await page.getByTestId('input-help-search').fill('book');
  await expect(page.getByRole('button', { name: 'How do I book?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Who can sit this exam?' })).toHaveCount(0);
});

test('legal page shows the legal-review notice', async ({ page }) => {
  await mockApi(page);
  await page.goto('/legal/terms');
  await expect(page.getByText(/REVIEW BY LEGAL COUNSEL/)).toBeVisible();
});

test('contact form validates and submits', async ({ page }) => {
  const { contacts } = await mockApi(page);
  await page.goto('/contact');
  await page.getByRole('button', { name: /Send message/ }).click();
  await expect(page.getByText('Enter your name')).toBeVisible();
  await page.getByLabel('Your name').fill('Dr Test');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Message').fill('Hello, this is a test message.');
  await page.getByRole('button', { name: /Send message/ }).click();
  await expect(page.getByText('Thanks for getting in touch')).toBeVisible();
  expect(contacts).toHaveLength(1);
});

test('mega menu opens by keyboard and closes with Escape', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Exams' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: /MRCEM Primary/ }).first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

for (const route of ['/', '/exams', '/exams/mrcem-primary', '/calendar', '/pricing', '/free-demo', '/help', '/contact']) {
  test(`axe: no serious or critical violations on ${route}`, async ({ page }) => {
    await mockApi(page);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
}
