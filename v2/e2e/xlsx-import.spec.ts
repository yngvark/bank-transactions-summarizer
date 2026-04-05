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
});
