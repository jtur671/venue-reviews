import { test, expect } from './helpers/fixtures';
import { gotoHome, ensureRoleChosen, waitForVenuePageLoaded } from './helpers/app';

test('search web results and create a new venue', async ({ page }) => {
  await gotoHome(page);
  await ensureRoleChosen(page, 'fan');

  // Watch for either photo caching or photo backfill.
  const photoRequest = page.waitForRequest((req) => {
    const url = req.url();
    return url.includes('/api/cache-venue-photo') || url.includes('/api/backfill-venue-photos');
  }, { timeout: 60_000 }).catch(() => null);

  // Scroll to the search section (input is not always in the initial viewport).
  await page.getByRole('button', { name: /search now/i }).click();

  const searchInput = page.getByLabel(/search venues by name or city/i);

  // Try a few queries until we get a "Be the first to grade it" CTA.
  const queries = [
    'Ottobar Baltimore',
    'Empty Bottle Chicago',
    'Neumos Seattle',
    'Hi Hat Los Angeles',
    'The Saturn Birmingham',
  ];
  let foundCreate = false;
  for (const q of queries) {
    await searchInput.fill(q);
    // Wait for remote search results section.
    await expect(page.getByRole('heading', { name: /search results from the web/i })).toBeVisible({ timeout: 30_000 });
    // Wait for any results to render.
    await page.waitForTimeout(500);
    const createButtons = page.getByRole('button', { name: /be the first to grade it/i });
    const count = await createButtons.count();
    if (count > 0) {
      foundCreate = true;
      break;
    }
  }

  test.skip(!foundCreate, 'No createable remote venue found; update query list for this dataset.');

  // Click the first "Be the first to grade it" button (i.e. not already in community DB).
  const createButton = page.getByRole('button', { name: /be the first to grade it/i }).first();
  await expect(createButton).toBeVisible({ timeout: 30_000 });
  await createButton.click();

  // Should navigate to a venue page.
  await expect(page).toHaveURL(/\/venues\/[0-9a-f-]{36}$/i, { timeout: 30_000 });
  await waitForVenuePageLoaded(page);

  // Ensure some photo pipeline request occurred (best-effort).
  const req = await photoRequest;
  expect(req, 'expected cache/backfill photo request').not.toBeNull();
});

