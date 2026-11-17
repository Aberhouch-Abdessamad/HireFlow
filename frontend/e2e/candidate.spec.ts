import { expect, test } from '@playwright/test';

test('candidate can sign in and open their dashboard', async ({ page }) => {
  await page.goto('/candidate/login');
  await page.getByLabel('Email').fill('candidate@example.test');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await page.goto('/candidate/dashboard');
  await expect(page.getByRole('heading', { name: /dashboard|my applications/i })).toBeVisible();
});
