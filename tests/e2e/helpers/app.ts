import { expect, type Page } from '@playwright/test';
import { acceptNextConfirm as acceptConfirm } from './fixtures';

export async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Venue Reviews')).toBeVisible();
}

export async function clickAnyVenueFromHome(page: Page) {
  // Wait for at least one venue link to appear.
  const venueLink = page.locator('a[href^="/venues/"]').first();
  await expect(venueLink).toBeVisible({ timeout: 30_000 });
  await venueLink.click();
}

export async function waitForVenuePageLoaded(page: Page) {
  // Venue page should render the "Leave a report card" section.
  await expect(page.getByRole('heading', { name: 'Leave a report card' })).toBeVisible({ timeout: 30_000 });
}

export async function acceptNextConfirm(page: Page) {
  await acceptConfirm(page);
}

export async function clearProfileDev(page: Page) {
  await acceptNextConfirm(page);
  await page.getByRole('button', { name: 'Clear profile' }).click();
  // Clear profile triggers a reload to "/"
  await page.waitForURL('**/');
}

export async function ensureRoleChosen(page: Page, role: 'artist' | 'fan' = 'artist') {
  // If modal is present (or appears), pick a role.
  const backdrop = page.locator('.modal-backdrop');
  const appeared = await backdrop
    .waitFor({ state: 'visible', timeout: 60_000 })
    .then(() => true)
    .catch(() => false);

  if (appeared) {
    const btnName = role === 'artist' ? /artist/i : /fan/i;
    await backdrop.getByRole('button', { name: btnName }).first().click();
    await expect(backdrop).toBeHidden({ timeout: 15_000 });
  }

  // Header badge should show after role is chosen.
  const expectedText = role === 'artist' ? 'Artist' : 'Fan';
  await expect(page.locator('header').getByText(expectedText, { exact: false })).toBeVisible({ timeout: 30_000 });
}

