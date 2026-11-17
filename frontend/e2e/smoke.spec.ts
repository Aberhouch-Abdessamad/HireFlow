import { expect, test } from '@playwright/test';

test('home redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
});
