import { test, expect } from '@playwright/test';

test.describe('Dark Mode Contrast', () => {
  test('numbers in heatmap cells should be visible in dark mode', async ({ page }) => {
    await page.goto('/', { timeout: 60000 });

    // Load sample data
    await page.click('text=Load sample data');
    await page.waitForSelector('.statistics-section table tbody tr');

    // Enable heatmap (disabled by default)
    await page.click('button:has-text("Heatmap")');

    // Toggle dark mode via the theme button
    await page.click('.theme-toggle-button');
    // Verify dark mode is active
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Check contrast on heatmap cells
    const results = await page.evaluate(() => {
      const cells = document.querySelectorAll('.num-cell');
      const issues: string[] = [];

      function luminance(r: number, g: number, b: number): number {
        const [rs, gs, bs] = [r, g, b].map(v => {
          v = v / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      // Walk up to find effective background color
      function getEffectiveBgColor(el: Element): [number, number, number] {
        let current: Element | null = el;
        while (current) {
          const bg = window.getComputedStyle(current).backgroundColor;
          const match = bg.match(/\d+/g)?.map(Number);
          if (match) {
            // Check if it's not transparent
            const alpha = match.length === 4 ? match[3] : (bg.includes('rgba') ? 0 : 1);
            if (alpha > 0 && !(match[0] === 0 && match[1] === 0 && match[2] === 0 && alpha === 0)) {
              return [match[0], match[1], match[2]];
            }
          }
          current = current.parentElement;
        }
        return [0, 0, 0]; // fallback to black
      }

      cells.forEach((cell, i) => {
        const el = cell as HTMLElement;
        const computed = window.getComputedStyle(el);
        const textColor = computed.color;

        const parseBg = getEffectiveBgColor(el);
        const parseText = textColor.match(/\d+/g)?.map(Number) || [0, 0, 0];

        const bgLum = luminance(parseBg[0], parseBg[1], parseBg[2]);
        const textLum = luminance(parseText[0], parseText[1], parseText[2]);

        const contrast = (Math.max(bgLum, textLum) + 0.05) / (Math.min(bgLum, textLum) + 0.05);

        // WCAG AA minimum for normal text is 4.5:1, but 3:1 for large text
        if (contrast < 3) {
          issues.push(
            `Cell ${i}: text=rgb(${parseText.join(',')}) bg=rgb(${parseBg.join(',')}) contrast=${contrast.toFixed(2)} content="${el.textContent?.trim()}"`
          );
        }
      });

      return {
        totalCells: cells.length,
        issueCount: issues.length,
        issues: issues.slice(0, 20),
        theme: document.documentElement.getAttribute('data-theme'),
      };
    });

    console.log(`Theme: ${results.theme}`);
    console.log(`Total numeric cells: ${results.totalCells}`);
    console.log(`Cells with contrast < 3:1: ${results.issueCount}`);
    results.issues.forEach(issue => console.log(`  ${issue}`));

    expect(results.issueCount, `Found ${results.issueCount} cells with insufficient contrast in dark mode`).toBe(0);
  });
});
