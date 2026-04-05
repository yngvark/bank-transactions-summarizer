import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureFile = path.resolve(__dirname, 'fixtures/test-transactions-dnb.xlsx');

test.describe('DNB XLSX file import', () => {
  test('uploading a DNB XLSX file displays statistics and transactions', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });

    // Upload the DNB test XLSX file
    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles(fixtureFile);

    // Wait for statistics table to appear
    await page.waitForSelector('.statistics-section table tbody tr');

    // Verify the file name is displayed
    await expect(page.locator('.file-name')).toContainText('test-transactions-dnb.xlsx');

    // Verify statistics table has rows (categories were processed)
    const statRows = page.locator('.statistics-section table tbody tr');
    await expect(statRows.first()).toBeVisible();

    // Verify DNB transaction texts appear in the transaction list
    await expect(page.locator('text=Visa-kjøp REMA 1000 Oslo')).toBeVisible();
    await expect(page.locator('text=Visa-kjøp Espresso House Grønland')).toBeVisible();
    await expect(page.locator('text=Visa-kjøp Elkjøp City Syd')).toBeVisible();
    await expect(page.locator('text=Kontoregulering 541 Fast Overføring')).toBeVisible();
  });
});
