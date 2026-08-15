import { expect, test } from '@playwright/test';

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
});
