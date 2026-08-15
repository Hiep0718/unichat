import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Automation Suite 01 — Landing Page & Branding', () => {
  test('should load home page and render hero headline, badge, and accessibility scan', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle(/UniChat/i);

    // Verify hero badge text
    const badge = page.locator('.hero__badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('UniChat v1.0');

    // Verify hero title
    const heroTitle = page.locator('#hero-title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('Trợ lý hỏi đáp tài liệu học tập');

    // Verify CTA primary button
    const primaryCta = page.locator('.hero__cta-primary');
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toContainText('Bắt đầu miễn phí');

    // Perform WCAG accessibility check
    const accessibilityScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    expect(accessibilityScan.violations).toEqual([]);
  });
});
