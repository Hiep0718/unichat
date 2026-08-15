import { expect, test } from '@playwright/test';

test.describe('Automation Suite 04 — RAG Chat Interface Scaffold', () => {
  test('should render hero browser mockup with chat interface preview', async ({ page }) => {
    await page.goto('/');

    const mockupUserMsg = page.locator('.mockup__user-msg');
    await expect(mockupUserMsg).toBeVisible();
    await expect(mockupUserMsg).toContainText('Tóm tắt các nguyên lý cơ bản');

    const mockupAiMsg = page.locator('.mockup__ai-msg');
    await expect(mockupAiMsg).toBeVisible();
    await expect(mockupAiMsg).toContainText('Tính lưỡng tính sóng - hạt');

    const citeBadge = page.locator('.mockup__cite').first();
    await expect(citeBadge).toBeVisible();
  });
});
