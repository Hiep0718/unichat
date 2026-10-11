/**
 * Authentication helper for benchmark E2E tests.
 * Handles login flow and session state persistence.
 */

import { Browser, BrowserContext, Page } from '@playwright/test';
import { TEST_USER } from '../specs/test-credentials.js';

/** Default timeout for auth operations. */
const AUTH_TIMEOUT_MS = 15_000;

/**
 * Performs login via the UI form and returns an authenticated Page.
 *
 * @param browser - Playwright Browser instance
 * @param baseURL - Application base URL
 * @returns Authenticated page ready for workspace navigation
 */
export async function loginAndGetPage(
  browser: Browser,
  baseURL: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: './reports/benchmark/videos' },
  });
  const page = await context.newPage();

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  const submitBtn = page.locator('button[type="submit"]');

  await emailInput.fill(TEST_USER.email, { timeout: AUTH_TIMEOUT_MS });
  await passwordInput.fill(TEST_USER.password);
  await submitBtn.click();

  await page.waitForURL(/\/workspaces/, { timeout: AUTH_TIMEOUT_MS });

  return { context, page };
}
