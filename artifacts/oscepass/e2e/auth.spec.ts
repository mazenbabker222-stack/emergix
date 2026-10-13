import { expect, test, type APIRequestContext } from '@playwright/test';

const password = 'correct-horse-battery-staple';

async function waitForLink(request: APIRequestContext, to: string, pathPart: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const res = await request.get('/api/test/outbox', { params: { to } });
    const mails = (await res.json()) as { text: string }[];
    for (const mail of mails) {
      const match = mail.text.match(new RegExp(`https?://[^\\s"'<>)\\]]*${pathPart}[^\\s"'<>)\\]]*`));
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no e-mail link containing ${pathPart}`);
}

test.describe('route guards', () => {
  test('anonymous visitors are sent to /login with a safe next parameter', async ({ page }) => {
    await page.goto('/app/account');
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Faccount$/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  });

  test('the admin API is closed to anonymous callers', async ({ request }) => {
    expect((await request.get('/api/admin/ping')).status()).toBe(401);
  });
});

test('sign up, confirm e-mail, log in, manage devices, log out', async ({ page, request }) => {
  const email = `e2e-${Date.now()}@example.test`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('E2E Learner');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('heading', { name: /confirm your e-mail address/i })).toBeVisible();

  const link = await waitForLink(request, email, 'verify-email');
  await page.goto(link);
  await expect(page.getByRole('heading', { name: /your e-mail address is confirmed/i })).toBeVisible();

  await page.goto('/app');
  await expect(page.getByRole('heading', { name: /welcome, e2e learner/i })).toBeVisible();

  await page.goto('/app/account');
  await expect(page.getByRole('heading', { name: /signed-in devices/i })).toBeVisible();
  await expect(page.getByText('This device')).toBeVisible();

  await page.getByRole('button', { name: /sign out/i }).first().click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('wrong-password-123');
  await page.getByRole('button', { name: /^log in/i }).click();
  await expect(page.getByRole('alert').filter({ hasText: /invalid e-mail or password/i })).toBeVisible();

  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /^log in/i }).click();
  await expect(page).toHaveURL(/\/app$/);
});
