import { test, expect } from './helpers/fixtures';
import { gotoHome, ensureRoleChosen } from './helpers/app';

test('login modal opens and closes', async ({ page }) => {
  await gotoHome(page);
  await ensureRoleChosen(page, 'artist');

  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  // Close via "×"
  await page.getByRole('button', { name: '×' }).click();
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeHidden();
});

test('email/password sign in navigates to account (optional)', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this test.');

  await gotoHome(page);
  await ensureRoleChosen(page, 'artist');

  await page.getByRole('button', { name: /^sign in$/i }).click();

  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);

  // Submit is the form submit button (text varies by mode).
  await page.getByRole('button', { name: /^sign in$/i }).nth(1).click();

  await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /your account/i })).toBeVisible();
});

