import { test, expect } from './helpers/fixtures';
import { clickAnyVenueFromHome, ensureRoleChosen, gotoHome, waitForVenuePageLoaded } from './helpers/app';

test('home → venue page → back does not get stuck loading', async ({ page }) => {
  await gotoHome(page);
  await ensureRoleChosen(page, 'artist');
  await clickAnyVenueFromHome(page);
  await waitForVenuePageLoaded(page);

  // Back navigation
  await page.getByRole('link', { name: /back to venues/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Start with a search')).toBeVisible();
});

