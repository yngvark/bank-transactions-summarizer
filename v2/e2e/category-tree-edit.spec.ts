import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureFile = path.resolve(__dirname, 'fixtures/test-transactions-bank-norwegian.xlsx');

async function loadFixture(page: Page) {
  await page.goto('/', { timeout: 60000 });
  await page.evaluate(() => {
    localStorage.removeItem('bts-savefile-v1');
    localStorage.removeItem('bts-rules-v1');
    localStorage.removeItem('theme');
  });
  await page.reload();
  await page.locator('#fileInput').setInputFiles(fixtureFile);
  await page.waitForSelector('.statistics-section table tbody tr');
}

test.describe('Category tree editing (prototype G)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name === 'Mobile Chrome',
      'mobile edit-mode is a known degraded experience for prototype G'
    );
  });

  test('toggle reveals edit chrome and Esc exits', async ({ page }) => {
    await loadFixture(page);
    const toggle = page.locator('[data-testid="cat-edit-toggle"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('.cat-edit-hint')).toBeVisible();
    await expect(page.locator('[data-testid="cat-add-primary"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cat-edit-hint')).toBeHidden();
  });

  test('rename a primary updates rules referencing it', async ({ page }) => {
    await loadFixture(page);

    const firstCell = page.locator('[data-testid="cat-cell-0"]');
    await firstCell.scrollIntoViewIfNeeded();
    await firstCell.click({ force: true });
    await page.locator('[data-testid="cd-primary-Reise"]').click();
    await page.locator('.category-dropdown button.cd-item-sub').first().click();
    await page.locator('[data-testid="rd-create"]').click();

    await page.locator('[data-testid="cat-edit-toggle"]').click();
    const reiseRow = page.locator('tr[data-path]').filter({ hasText: 'Reise' }).first();
    await reiseRow.locator('.cat-name.editable').first().click();
    const input = page.locator('.cat-name-input');
    await input.fill('Travel');
    await input.press('Enter');

    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await expect(page.locator('.statistics-section table')).toContainText('Travel');
    await expect(page.locator('.statistics-section table')).not.toContainText('Reise');

    await page.locator('[data-testid="rules-panel-toggle"]').click();
    await expect(page.locator('.rules-category').first()).toContainText('Travel');
  });

  test('add a child appears in the tree and persists', async ({ page }) => {
    await loadFixture(page);
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    const matRow = page.locator('tr[data-path]').filter({ hasText: 'Mat og drikke' }).first();
    const addBtn = matRow.locator('.icon-btn.add');
    await addBtn.click();
    const input = page.locator('.cat-name-input');
    await input.fill('Snacks');
    await input.press('Enter');

    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await expect(page.locator('tr[data-path]').filter({ hasText: 'Snacks' })).toBeVisible();
  });

  test('delete a primary cascades and removes the rows', async ({ page }) => {
    await loadFixture(page);
    page.on('dialog', (d) => d.accept());
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    const reiseRow = page.locator('tr[data-path]').filter({ hasText: 'Reise' }).first();
    await reiseRow.locator('.icon-btn.danger').click();
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await expect(page.locator('.statistics-section table')).not.toContainText('Reise');
  });

  test('add primary appends a new top-level row', async ({ page }) => {
    await loadFixture(page);
    await page.locator('[data-testid="cat-edit-toggle"]').click();
    await page.locator('[data-testid="cat-add-primary"]').click();
    const input = page.locator('.cat-name-input');
    await input.fill('Investments');
    await input.press('Enter');
    await expect(page.locator('tr[data-path]').filter({ hasText: 'Investments' })).toBeVisible();
  });
});
