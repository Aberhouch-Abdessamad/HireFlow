import { expect, test } from '@playwright/test';

test('analytics page shows its report sections after login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('company.admin@acme.test');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Applications by month' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hiring funnel' })).toBeVisible();
});
