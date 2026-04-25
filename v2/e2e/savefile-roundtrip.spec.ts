import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureFile = path.resolve(__dirname, 'fixtures/test-transactions-bank-norwegian.xlsx');

const SAVEFILE_KEY = 'bts-savefile-v1';

async function freshAppWithData(page: Page) {
  await page.goto('/', { timeout: 60000 });
  await page.evaluate((key) => localStorage.removeItem(key), SAVEFILE_KEY);
  await page.evaluate(() => {
    localStorage.removeItem('bts-rules-v1');
    localStorage.removeItem('theme');
  });
  await page.reload();
  await page.locator('#fileInput').setInputFiles(fixtureFile);
  await page.waitForSelector('.statistics-section table tbody tr');
}

test.describe('SaveFile persistence', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === 'Mobile Chrome',
      'desktop-only header layout for now'
    );
  });

  test('config toolbar is visible in header', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await expect(page.locator('[data-testid="config-load"]')).toBeVisible();
    await expect(page.locator('[data-testid="config-save"]')).toBeVisible();
  });

  test('migration runs on first load and writes savefile to localStorage', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      SAVEFILE_KEY
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.version).toBe(1);
    expect(parsed.settings.density).toBe('normal');
    expect(Object.keys(parsed.rules.merchantCodeMappings).length).toBeGreaterThan(0);
  });

  test('migrates legacy bts-rules-v1 and theme into savefile', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => {
      localStorage.setItem(
        'bts-rules-v1',
        JSON.stringify([
          { id: 'legacy-1', type: 'substring', pattern: 'IKEA', category: ['Hus og innbo', 'Interiør og varehus'] },
        ])
      );
      localStorage.setItem('theme', 'dark');
    });
    await page.reload();

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      SAVEFILE_KEY
    );
    const parsed = JSON.parse(stored!);
    expect(parsed.rules.textPatternRules).toHaveLength(1);
    expect(parsed.rules.textPatternRules[0].pattern).toBe('IKEA');
    expect(parsed.settings.theme).toBe('dark');

    const legacyRules = await page.evaluate(() => localStorage.getItem('bts-rules-v1'));
    const legacyTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(legacyRules).toBeNull();
    expect(legacyTheme).toBeNull();
  });

  test('save → modify → load round-trip restores rules and theme', async ({ page }) => {
    await freshAppWithData(page);

    // Create a rule by clicking a transaction category cell
    await page.locator('[data-testid="cat-cell-0"]').click();
    await page.locator('[data-testid="cd-primary-Reise"]').click();
    const subItem = page.locator('.category-dropdown button.cd-item-sub').first();
    await expect(subItem).toBeVisible();
    await subItem.click();
    await page.locator('[data-testid="rd-create"]').click();
    await expect(page.locator('[data-testid="rd-create"]')).toHaveCount(0);

    // Save: dirty indicator should be present, then click triggers download
    const saveButton = page.locator('[data-testid="config-save"]');
    await expect(saveButton).toContainText('●');

    const downloadPromise = page.waitForEvent('download');
    await saveButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^bank-config-\d{8}-\d{6}\.json$/);

    // After save, dirty indicator clears
    await expect(saveButton).not.toContainText('●');

    // Read the saved file
    const savedPath = await download.path();
    expect(savedPath).toBeTruthy();
    const savedJson = await page.evaluate(async (p) => p, savedPath);
    expect(savedJson).toBeTruthy();

    // Capture current state
    const before = await page.evaluate((key) => localStorage.getItem(key), SAVEFILE_KEY);
    expect(before).toContain('"textPatternRules"');

    // Modify state: delete the rule via dropdown
    await page.locator('[data-testid="cat-cell-0"]').click();
    await page.locator('[data-testid="cd-remove"]').click();
    await page.locator('[data-testid="rd-confirm-delete"]').click();

    // Confirm rule removed (rules panel disappears when count goes to 0)
    await expect(page.locator('[data-testid="rules-list"]')).toHaveCount(0);

    // Now load the saved file back via the Load button
    const fileInput = page.locator('[data-testid="config-file-input"]');
    await fileInput.setInputFiles(savedPath!);

    // Rule should be restored
    await expect(page.locator('[data-testid="rules-panel-toggle"]')).toBeVisible();
    await page.locator('[data-testid="rules-panel-toggle"]').click();
    await expect(page.locator('.rules-row')).toHaveCount(1);
  });

  test('loading an invalid file shows toast', async ({ page }, testInfo) => {
    await page.goto('/', { timeout: 60000 });

    const badFile = path.join(testInfo.outputDir, 'bad.json');
    await page.evaluate(() => localStorage.removeItem('bts-savefile-v1'));

    const fs = await import('fs/promises');
    await fs.mkdir(path.dirname(badFile), { recursive: true });
    await fs.writeFile(badFile, JSON.stringify({ version: 99 }), 'utf-8');

    await page.locator('[data-testid="config-file-input"]').setInputFiles(badFile);
    await expect(page.locator('.toast.visible')).toContainText('Invalid save file');
  });
});
