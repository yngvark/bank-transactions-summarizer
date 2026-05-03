# Testing Guide

This guide explains how to run the Playwright end-to-end tests locally.

## Prerequisites

- Node.js 20 or higher
- pnpm

## Installation

1. **Install frontend dependencies:**
   ```bash
   cd v2/frontend
   pnpm install
   ```

2. **Install Playwright test dependencies:**
   ```bash
   cd v2
   pnpm install
   ```

3. **Install Playwright browsers:**
   ```bash
   cd v2
   pnpm exec playwright install --with-deps
   ```
   
   This will download Chromium, Firefox, and WebKit browsers needed for testing.

## Running Tests

All commands should be run from the `v2` directory.

### Run all tests (headless mode)
```bash
pnpm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
pnpm run test:e2e:ui
```
This opens the Playwright Test UI where you can:
- See all tests in a tree view
- Run individual tests
- Watch tests run in real-time
- Debug failures with time-travel debugging

### Run tests in headed mode (see browser)
```bash
pnpm run test:e2e:headed
```
This runs tests with the browser visible, useful for debugging.

### View test report
```bash
pnpm run test:e2e:report
```
Opens the HTML report from the last test run.

## Running Specific Tests

### Run tests for a specific browser
```bash
pnpm exec playwright test --project=chromium
```

### Run a specific test file
```bash
pnpm exec playwright test e2e/desktop-responsive.spec.ts
```

### Run tests matching a pattern
```bash
pnpm exec playwright test --grep "should hide month columns"
```

## Debugging Tests

### Debug mode
```bash
pnpm exec playwright test --debug
```
This opens Playwright Inspector for step-by-step debugging.

### Debug a specific test
```bash
pnpm exec playwright test --debug --grep "should display all columns"
```

### Generate trace
```bash
pnpm exec playwright test --trace on
```
Traces are saved in `test-results/` and can be viewed with:
```bash
pnpm exec playwright show-trace test-results/path-to-trace.zip
```

## Test Structure

- `e2e/desktop-responsive.spec.ts` - Desktop responsiveness tests (Desktop Chrome viewport)

## Continuous Integration

Tests run automatically in GitHub Actions on:
- Push to `main` branch
- All pull requests

The CI workflow:
1. Installs dependencies
2. Installs Playwright browsers
3. Runs all tests across all browsers
4. Uploads test reports as artifacts

## Troubleshooting

### "Executable doesn't exist" error
Run: `pnpm exec playwright install --with-deps`

### Port 5173 already in use
The dev server runs on port 5173. If it's in use, stop the existing server or change the port in `playwright.config.ts`.

### Browser not found
Make sure you've run `pnpm exec playwright install --with-deps` to install all browser binaries.

### Tests timing out
The webServer might not be starting correctly. Ensure:
- Frontend dependencies are installed: `cd frontend && pnpm install`
- Port 5173 is available
- Check the dev server starts manually: `cd frontend && pnpm run dev`
