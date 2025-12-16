import { test, expect } from './helpers/fixtures';
import { gotoHome, ensureRoleChosen, clickAnyVenueFromHome, waitForVenuePageLoaded, acceptNextConfirm } from './helpers/app';

test('create, update, and delete a review (anonymous)', async ({ page }) => {
  await gotoHome(page);
  await ensureRoleChosen(page, 'artist');

  await clickAnyVenueFromHome(page);
  await waitForVenuePageLoaded(page);

  // Create
  const uniqueComment = `E2E review ${Date.now()}`;
  await page.getByPlaceholder('Anonymous').fill('Playwright');
  await page.getByPlaceholder(/best and worst parts/i).fill(uniqueComment);
  await page.getByRole('button', { name: /submit review/i }).click();

  // Verify "Your report card" appears with our comment.
  const myCard = page.getByLabel(/Your report card for this venue/i);
  await expect(myCard).toBeVisible({ timeout: 20_000 });
  await expect(myCard.getByText(uniqueComment)).toBeVisible();

  // Update
  const updatedComment = `${uniqueComment} (updated)`;
  await page.getByPlaceholder(/best and worst parts/i).fill(updatedComment);
  await page.getByRole('button', { name: /update report card/i }).click();
  await expect(myCard.getByText(updatedComment)).toBeVisible({ timeout: 20_000 });

  // Delete
  await acceptNextConfirm(page);
  await page.getByRole('button', { name: /remove my report card/i }).click();
  await expect(page.getByLabel(/Your report card for this venue/i)).toBeHidden({ timeout: 20_000 });
});

