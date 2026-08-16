import { expect, test } from '@playwright/test';
import { TEST_USER } from './test-credentials.js';

test.describe('Automation Suite 02 — Authentication & Navigation Guards', () => {
  test('should redirect unauthenticated visitor from /workspaces to /login', async ({ page }) => {
    await page.goto('/workspaces');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('should render login page form with email and password fields', async ({ page }) => {
    await page.goto('/login');

    const loginTitle = page.getByRole('heading', { level: 1 });
    await expect(loginTitle).toBeVisible();

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('should fill credentials and attempt login with test account', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await expect(emailInput).toHaveValue(TEST_USER.email);

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
  });
});

