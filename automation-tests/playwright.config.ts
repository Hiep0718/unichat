import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Automation Config with automatic video recording and HTML/JSON reporting.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  outputDir: './reports/test-results',
  reporter: [
    ['html', { outputFolder: './reports/html-report', open: 'never' }],
    ['json', { outputFile: './reports/test-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'benchmark',
      testMatch: /07-rag-benchmark/,
      timeout: 7_200_000, // 2 hours per test
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        video: 'on',
        screenshot: 'on',
        trace: 'on',
      },
    },
  ],
  globalTimeout: 14_400_000, // 4 hours for full benchmark suite
  webServer: {
    command: 'npm run dev --prefix ../frontend',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
