import { test, expect, devices } from '@playwright/test';

// Desktop tests - using Desktop Chrome viewport
test.describe('Desktop Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(devices['Desktop Chrome'].viewport!);
  });

  test('should display all columns in statistics table on desktop', async ({ page }) => {
    await page.goto('/');

    // Load sample data
    await page.click('button:has-text("Load Sample Data")');

    // Wait for the statistics table to load
    await page.waitForSelector('h2:has-text("Spending by Category")');

    // Check that month columns are visible
    const jan2023 = page.locator('th:has-text("2023-01")');
    await expect(jan2023).toBeVisible();

    const dec2023 = page.locator('th:has-text("2023-12")');
    await expect(dec2023).toBeVisible();

    // Check that Sum and Average are also visible
    const sumHeader = page.locator('th:has-text("Sum")');
    const avgHeader = page.locator('th:has-text("Average")');
    await expect(sumHeader).toBeVisible();
    await expect(avgHeader).toBeVisible();
  });

  test('should display density settings on desktop', async ({ page }) => {
    await page.goto('/');

    // Load sample data
    await page.click('button:has-text("Load Sample Data")');

    // Wait for display settings
    await page.waitForSelector('text=Density:');

    // Check density control is visible
    const densityLabel = page.locator('text=Density:');
    await expect(densityLabel).toBeVisible();

    // Check all density options are visible
    for (const label of ['Compact', 'Normal', 'Comfortable', 'Spacious']) {
      await expect(page.locator(`button:has-text("${label}")`)).toBeVisible();
    }
  });

  test('should maintain desktop experience unchanged', async ({ page }) => {
    await page.goto('/');

    // Check header
    await expect(page.locator('h1:has-text("Bank Transactions")')).toBeVisible();

    // Load sample data
    await page.click('button:has-text("Load Sample Data")');

    // Wait for content
    await page.waitForSelector('table');

    // Check both tables are visible
    const tables = page.locator('table');
    await expect(tables).toHaveCount(2);

    // Check statistics table has all columns
    const statisticsTable = tables.first();
    const monthHeaders = statisticsTable.locator('th:has-text("2023-")');
    await expect(monthHeaders.first()).toBeVisible();

    // Check transactions table is fully visible
    const transactionsTable = tables.nth(1);
    await expect(transactionsTable).toBeVisible();
  });
});
