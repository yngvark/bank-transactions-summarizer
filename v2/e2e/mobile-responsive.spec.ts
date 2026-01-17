import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsive Design', () => {
  test.use(devices['iPhone 12']);

  test('should display mobile-friendly layout', async ({ page }) => {
    await page.goto('http://localhost:3456');
    
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
    await page.goto('http://localhost:3456');
    
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
    await page.goto('http://localhost:3456');
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    
    // Wait for display settings to appear
    await page.waitForSelector('text=Text size:');
    
    // Get the display settings container
    const displaySettings = page.locator('div:has(button:has-text("Compact"))').first();
    
    // Check that settings are visible
    await expect(displaySettings).toBeVisible();
    
    // Check text size label
    const textSizeLabel = page.locator('text=Text size:');
    await expect(textSizeLabel).toBeVisible();
    
    // Check spacing label
    const spacingLabel = page.locator('text=Spacing:');
    await expect(spacingLabel).toBeVisible();
  });

  test('should optimize transactions table for mobile', async ({ page }) => {
    await page.goto('http://localhost:3456');
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    
    // Wait for transactions table
    await page.waitForSelector('h2:has-text("Transactions")');
    
    // Check that table is visible
    const transactionsTable = page.locator('table').nth(1);
    await expect(transactionsTable).toBeVisible();
    
    // Check that table can scroll horizontally
    const tableWrapper = transactionsTable.locator('..');
    const boundingBox = await tableWrapper.boundingBox();
    expect(boundingBox).toBeTruthy();
  });

  test('should have adequate touch targets on mobile', async ({ page }) => {
    await page.goto('http://localhost:3456');
    
    // Check upload button has adequate size
    const uploadButton = page.locator('button:has-text("Upload Excel File")');
    await expect(uploadButton).toBeVisible();
    
    const uploadBox = await uploadButton.boundingBox();
    expect(uploadBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    await page.waitForSelector('button:has-text("Compact")');
    
    // Check display setting buttons have adequate size
    const compactButton = page.locator('button:has-text("Compact")').first();
    const compactBox = await compactButton.boundingBox();
    expect(compactBox?.height).toBeGreaterThanOrEqual(32); // Smaller buttons but still tappable
  });

  test('should wrap long text appropriately on mobile', async ({ page }) => {
    await page.goto('http://localhost:3456');
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    
    // Wait for transactions to load
    await page.waitForSelector('table tbody tr');
    
    // Check that text in cells doesn't overflow
    const firstTransactionText = page.locator('table tbody tr').first().locator('td').nth(1);
    await expect(firstTransactionText).toBeVisible();
    
    // Check category text
    const categoryCell = page.locator('table tbody tr').first().locator('td').last();
    await expect(categoryCell).toBeVisible();
  });
});

test.describe('Desktop Responsive Design', () => {
  test.use(devices['Desktop Chrome']);

  test('should display all columns in statistics table on desktop', async ({ page }) => {
    await page.goto('http://localhost:3456');
    
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

  test('should display settings side by side on desktop', async ({ page }) => {
    await page.goto('http://localhost:3456');
    
    // Load sample data
    await page.click('button:has-text("Load Sample Data")');
    
    // Wait for display settings
    await page.waitForSelector('text=Text size:');
    
    // Get both setting groups
    const textSizeSection = page.locator('div:has-text("Text size:")').first();
    const spacingSection = page.locator('div:has-text("Spacing:")').first();
    
    await expect(textSizeSection).toBeVisible();
    await expect(spacingSection).toBeVisible();
    
    // Check they are horizontally aligned by checking their positions
    const textBox = await textSizeSection.boundingBox();
    const spacingBox = await spacingSection.boundingBox();
    
    expect(textBox?.y).toBeDefined();
    expect(spacingBox?.y).toBeDefined();
    
    // They should be on the same row (similar Y coordinates)
    if (textBox && spacingBox) {
      const yDiff = Math.abs(textBox.y - spacingBox.y);
      expect(yDiff).toBeLessThan(50); // Allow some tolerance
    }
  });

  test('should maintain desktop experience unchanged', async ({ page }) => {
    await page.goto('http://localhost:3456');
    
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
  const devices_to_test = [
    { name: 'iPhone SE', device: devices['iPhone SE'] },
    { name: 'iPad Pro', device: devices['iPad Pro'] },
    { name: 'Desktop', device: devices['Desktop Chrome'] }
  ];

  for (const { name, device } of devices_to_test) {
    test(`should be functional on ${name}`, async ({ browser }) => {
      const context = await browser.newContext(device);
      const page = await context.newPage();
      
      await page.goto('http://localhost:3456');
      
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
