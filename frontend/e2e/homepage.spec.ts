import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('should display an accessible scaffold when a visitor opens the app', async ({ page }) => {
  // Arrange and Act
  await page.goto('/');
  const accessibilityScan = await new AxeBuilder({ page }).analyze();

  // Assert
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('UniChat');
  expect(accessibilityScan.violations).toEqual([]);
});