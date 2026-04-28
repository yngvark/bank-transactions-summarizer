import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureFile = path.resolve(__dirname, 'fixtures/test-transactions-bank-norwegian.xlsx');

// User-story corpus.
//
// Each test describes a behavior the system should always uphold, in user
// language. Append a story when adding or clarifying a feature; the corpus
// reflects the system as it should be, not the history of bugs encountered.
//
// Conventions:
// - Phrase test names as user actions ("I can ...").
// - Tests are independent — no shared state, no required ordering.

async function loadFixture(page: Page) {
  await page.goto('/', { timeout: 60000 });
  await page.evaluate(() => {
    localStorage.removeItem('bts-savefile-v1');
  });
  await page.reload();
  await page.locator('#fileInput').setInputFiles(fixtureFile);
  await page.waitForSelector('.statistics-section table tbody tr');
}

test.describe('User stories', () => {
  test('I can upload an Excel file and see my statistics and transactions', async ({ page }) => {
    await loadFixture(page);
    await expect(page.locator('.statistics-section table tbody tr').first()).toBeVisible();
    await expect(page.locator('#transactions-table tbody tr').first()).toBeVisible();
  });

  for (const mode of ['view', 'edit'] as const) {
    test(`I can collapse and re-expand a category by clicking its chevron (${mode} mode)`, async ({ page }, testInfo) => {
      test.skip(
        mode === 'edit' && testInfo.project.name === 'Mobile Chrome',
        'mobile edit mode is intentionally degraded'
      );
      await loadFixture(page);
      if (mode === 'edit') {
        await page.locator('[data-testid="cat-edit-toggle"]').click();
      }

      const parentRow = page.locator('tr[data-path]').filter({ hasText: 'Mat og drikke' }).first();
      const chevron = parentRow.locator('.chevron');
      await expect(chevron).toBeVisible();

      // Either starting state is fine — what matters is that clicking toggles it.
      const initiallyOpen = (await chevron.getAttribute('class') ?? '').includes('open');

      await chevron.click();
      if (initiallyOpen) {
        await expect(chevron).not.toHaveClass(/open/);
      } else {
        await expect(chevron).toHaveClass(/open/);
      }

      await chevron.click();
      if (initiallyOpen) {
        await expect(chevron).toHaveClass(/open/);
      } else {
        await expect(chevron).not.toHaveClass(/open/);
      }
    });
  }

  test('When I type in the search field, the transactions list narrows to matching rows', async ({ page }) => {
    await loadFixture(page);
    const rows = page.locator('#transactions-table tbody tr');
    const totalBefore = await rows.count();
    expect(totalBefore).toBeGreaterThan(1);

    await page.locator('.search-input').fill('NETFLIX');

    await expect.poll(async () => rows.count(), { timeout: 5000 }).toBeLessThan(totalBefore);
    const remainingText = await page.locator('#transactions-table tbody').innerText();
    expect(remainingText).toContain('NETFLIX');
  });

  test('I can rename a category and the new name is shown in the statistics table', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'mobile edit mode is intentionally degraded');
    await loadFixture(page);
    await page.locator('[data-testid="cat-edit-toggle"]').click();

    // Pick a category the fixture has transactions in, so view-mode statistics
    // show the renamed row.
    const row = page.locator('tr[data-path]').filter({ hasText: 'Mat og drikke' }).first();
    await row.locator('.cat-name.editable').first().click();
    const input = page.locator('.cat-name-input');
    await input.fill('Food');
    await input.press('Enter');

    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await expect(page.locator('.statistics-section table')).toContainText('Food');
    await expect(page.locator('.statistics-section table')).not.toContainText('Mat og drikke');
  });

  test('I can switch between light and dark themes', async ({ page }) => {
    await loadFixture(page);
    const initial = (await page.locator('html').getAttribute('data-theme')) ?? 'light';
    const expectedAfter = initial === 'dark' ? 'light' : 'dark';
    await page.locator('.theme-toggle-button').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', expectedAfter);
  });

  test('I can export my configuration to a file and import it back later', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'Mobile Chrome', 'desktop-only header layout for now');
    await page.goto('/', { timeout: 60000 });

    // Both buttons live in the header toolbar.
    await expect(page.locator('[data-testid="config-import"]')).toBeVisible();
    const exportButton = page.locator('[data-testid="config-export"]');
    await expect(exportButton).toBeVisible();

    // Export triggers a JSON download.
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    // Import accepts the downloaded file.
    const savedPath = await download.path();
    expect(savedPath).toBeTruthy();
    await page.locator('[data-testid="config-file-input"]').setInputFiles(savedPath!);
    await expect(page.locator('.toast.visible')).toHaveCount(0);
  });
});
