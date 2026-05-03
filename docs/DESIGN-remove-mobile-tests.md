# Remove mobile Playwright tests

## Why

E2E test runtime had grown long enough to hurt the local feedback loop. Every spec ran twice — once under the `chromium` (Desktop Chrome) project and once under `Mobile Chrome` (Pixel 5) — even though most tests were not mobile-specific.

Several specs already carried `test.skip(testInfo.project.name === 'Mobile Chrome', ...)` guards because mobile dropdown positioning and edit-mode are knowingly degraded under Pixel 5 emulation. The mobile project was therefore re-running the same desktop coverage at slower speed for limited extra signal.

## What changed

- **`v2/playwright.config.ts`** — dropped the `Mobile Chrome` project. Only `chromium` remains.
- **`v2/e2e/mobile-responsive.spec.ts` → `desktop-responsive.spec.ts`** — removed the `Mobile Responsive Design` describe block and the Pixel 5 entry of `Cross-Device Compatibility`. Kept the `Desktop Responsive Design` block (verifies all month columns render on desktop). Renamed the file to match.
- **Skip guards removed** from `user-stories.spec.ts`, `category-tree-edit.spec.ts`, `category-rules.spec.ts`, `savefile-roundtrip.spec.ts` — they were no-ops once the Mobile Chrome project was gone.
- **`v2/TESTING.md`** — pruned references to mobile/multi-browser projects that no longer exist.

Test count: 41 (was ~80 across both projects). All passing.

## What this does NOT mean

The app is still expected to render on mobile viewports — that is a product concern, not a Playwright concern. If a future change risks breaking mobile layout, prefer one of:

1. A targeted spec that sets `page.setViewportSize(...)` inside the `chromium` project (no separate Playwright project needed).
2. A unit / component test that asserts the responsive class behavior directly.

Re-introducing a full second Playwright project just to cover layout is the wrong tradeoff.
