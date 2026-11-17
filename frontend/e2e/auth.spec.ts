import { expect, test } from '@playwright/test';

const DEMO_EMAIL = 'company.admin@acme.test';
const DEMO_PASSWORD = 'Password123!';

test('staff member can sign in and open the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DEMO_EMAIL);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
});

test('unauthenticated visitors are redirected away from protected pages', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
