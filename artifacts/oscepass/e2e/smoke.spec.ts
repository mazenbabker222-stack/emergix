import { expect, test } from '@playwright/test';

test('home page renders with the Emergix Academy brand and legal disclaimer', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Emergix Academy/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByText('Not affiliated with or endorsed by the Royal College of Emergency Medicine.'),
  ).toBeVisible();
});
