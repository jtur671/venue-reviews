import { test, expect } from './helpers/fixtures';
import { gotoHome, ensureRoleChosen, clickAnyVenueFromHome, waitForVenuePageLoaded } from './helpers/app';

test('anonymous role prompt appears once and badge is immutable', async ({ page }) => {
  await gotoHome(page);

  // First visit: modal should appear, choose role.
  await ensureRoleChosen(page, 'fan');

  // Modal should not re-open after role set (navigate around).
  await clickAnyVenueFromHome(page);
  await waitForVenuePageLoaded(page);

  // Ensure no modal is present anymore.
  await expect(page.locator('.modal-backdrop')).toBeHidden();

  // Badge still present
  await expect(page.locator('header').getByText('Fan', { exact: false })).toBeVisible();

  // Navigate to another venue; still no modal.
  await page.goto('/');
  await clickAnyVenueFromHome(page);
  await waitForVenuePageLoaded(page);
  await expect(page.locator('.modal-backdrop')).toBeHidden();
  await expect(page.locator('header').getByText('Fan', { exact: false })).toBeVisible();
});

