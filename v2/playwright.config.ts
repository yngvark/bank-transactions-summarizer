import { defineConfig, devices } from '@playwright/test';

// Use system Chromium when PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is set (e.g. in Docker).
// channel: 'chrome' hangs in Alpine containers; executablePath with explicit args works.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const launchOptions = chromiumPath
  ? { executablePath: chromiumPath, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] }
  : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    launchOptions,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    cwd: './frontend',
  },
});
