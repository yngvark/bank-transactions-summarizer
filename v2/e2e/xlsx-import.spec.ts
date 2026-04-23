import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureFile = path.resolve(__dirname, 'fixtures/test-transactions-bank-norwegian.xlsx');

test.describe('XLSX file import', () => {
  test('uploading an XLSX file displays statistics and transactions', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });

    // Upload the test XLSX file
    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(fixtureFile);

    // Wait for statistics table to appear
    await page.waitForSelector('.statistics-section table tbody tr');

    // Verify the file name is displayed
    await expect(page.locator('.file-name')).toContainText('test-transactions-bank-norwegian.xlsx');

    // Verify statistics table has rows (categories were processed)
    const statRows = page.locator('.statistics-section table tbody tr');
    await expect(statRows.first()).toBeVisible();

    // Verify transaction texts appear in the transaction list
    await expect(page.locator('text=Purchase at KOMPLETT.NO - Online')).toBeVisible();
    await expect(page.locator('text=Payment to REMA 1000')).toBeVisible();
    await expect(page.locator('text=ESPRESSO HOUSE')).toBeVisible();
    await expect(page.locator('text=Subscription for NETFLIX')).toBeVisible();
  });

  test('Reservert (pending) rows show in list but are excluded from statistics', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });

    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(fixtureFile);

    await page.waitForSelector('.statistics-section table tbody tr');

    // Pending row is visible in the transaction list
    await expect(page.locator('#transactions-table').getByText('Pending at ZARA')).toBeVisible();

    // Settled fixture data spans only 2023-03 and 2023-04 — the pending row has no date
    // and must not introduce a third month column.
    const headerCells = page.locator('.statistics-section table thead th');
    const headerTexts = await headerCells.allTextContents();
    const monthHeaders = headerTexts.filter((t) => /^\d{4}-\d{2}$/.test(t.trim()));
    expect(monthHeaders).toEqual(['2023-03', '2023-04']);

    // The pending amount (-299) must not appear in any statistics cell.
    const statsText = await page.locator('.statistics-section table').innerText();
    expect(statsText).not.toContain('-299');
  });
});
