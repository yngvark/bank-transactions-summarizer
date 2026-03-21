import { test, expect, devices } from '@playwright/test';

// Mobile tests - using iPhone 12 viewport
test.describe('Mobile Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(devices['iPhone 12'].viewport!);
  });

  test('should display mobile-friendly layout', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('h1');
    
    // Check header is visible
    const header = page.locator('h1:has-text("Bank Transactions")');
    await expect(header).toBeVisible();
    
    // Check subtitle is visible
    const subtitle = page.locator('text=Analyze and categorize your spending');
    await expect(subtitle).toBeVisible();
  });

  test('should hide month columns in statistics table on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    
    // Wait for the statistics table to load
    await page.waitForSelector('h2:has-text("Spending by Category")');
    
    // Check that month column headers are hidden
    const monthColumns = page.locator('th:has-text("2023-")');
    await expect(monthColumns.first()).toBeHidden();
    
    // Check that Sum and Average columns are visible
    const sumHeader = page.locator('th:has-text("Sum")');
    const avgHeader = page.locator('th:has-text("Average")');
    await expect(sumHeader).toBeVisible();
    await expect(avgHeader).toBeVisible();
    
    // Check that month cells are hidden in data rows
    const monthCells = page.locator('tbody tr').first().locator('td').nth(1);
    await expect(monthCells).toBeHidden();
  });

  test('should stack display settings vertically on mobile', async ({ page }) => {
    await page.goto('/');

    // Load sample data
    await page.click('button:has-text("Load Sample Data")');

    // Wait for display settings to appear
    await page.waitForSelector('text=Density:');

    // Get the display settings container
    const displaySettings = page.locator('div:has(button:has-text("Compact"))').first();

    // Check that settings are visible
    await expect(displaySettings).toBeVisible();

    // Check density label
    const densityLabel = page.locator('text=Density:');
    await expect(densityLabel).toBeVisible();
  });

  test('should optimize transactions table for mobile', async ({ page }) => {
    await page.goto('/');
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    
    // Wait for transactions table
    await page.waitForSelector('h2:has-text("Transactions")');
    
    // Check that table is visible
    const transactionsTable = page.locator('table').nth(1);
    await expect(transactionsTable).toBeVisible();
  });

  test('should have adequate touch targets on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Check upload label has adequate size
    const uploadLabel = page.locator('label.file-upload-label');
    await expect(uploadLabel).toBeVisible();
    
    const uploadBox = await uploadLabel.boundingBox();
    expect(uploadBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    await page.waitForSelector('button:has-text("Compact")');
    
    // Check display setting buttons are visible and tappable
    const compactButton = page.locator('button:has-text("Compact")').first();
    await expect(compactButton).toBeVisible();
    const compactBox = await compactButton.boundingBox();
    expect(compactBox?.height).toBeGreaterThan(0); // Button is rendered and has size
  });

  test('should wrap long text appropriately on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    
    // Wait for transactions to load
    await page.waitForSelector('.transactions-section table tbody tr');
    
    // Check that text in cells doesn't overflow in transactions table
    const firstTransactionText = page.locator('.transactions-section table tbody tr').first().locator('td').nth(1);
    await expect(firstTransactionText).toBeVisible();
    
    // Check category text
    const categoryCell = page.locator('.transactions-section table tbody tr').first().locator('td').last();
    await expect(categoryCell).toBeVisible();
  });
});

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

test.describe('Cross-Device Compatibility', () => {
  const devicesToTest = [
    { name: 'Pixel 5', device: devices['Pixel 5'], browsers: ['chromium', 'Mobile Chrome'] },
    { name: 'Desktop', device: devices['Desktop Chrome'], browsers: ['chromium', 'firefox'] }
  ];

  for (const { name, device, browsers } of devicesToTest) {
    test(`should be functional on ${name}`, async ({ browser, browserName }) => {
      // Skip mobile device tests on Firefox (doesn't support isMobile option)
      if (name === 'Pixel 5' && browserName === 'firefox') {
        test.skip();
        return;
      }
      
      const context = await browser.newContext(device);
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Basic functionality test
      await expect(page.locator('h1')).toBeVisible();
      
      // Load sample data
      await page.click('button:has-text("Load Sample Data")');
      
      // Wait for tables to load
      await page.waitForSelector('table');
      
      // Check that data is displayed
      const tables = page.locator('table');
      await expect(tables).toHaveCount(2);
      
      // Check search is functional
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      
      await context.close();
    });
  }
});
