import { expect, test } from '@playwright/test';

test('a new company can register and reach the app', async ({ page }) => {
  const stamp = Date.now();
  await page.goto('/register');
  await page.getByLabel('Company name').fill(`Playwright Co ${stamp}`);
  await page.getByLabel('Your full name').fill('Playwright User');
  await page.getByLabel('Work email').fill(`playwright-${stamp}@example.test`);
  await page.getByLabel('Password').fill('Str0ngPassw0rd!');
  await page.getByLabel('Confirm password').fill('Str0ngPassw0rd!');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/$/);
});
