import { expect, test } from '@playwright/test';

test.use(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});

test('should apply the chat design to assistant actions and processing steps', async ({ page }) => {
  await page.goto('/e2e/fixtures/chat-message-preview.html');

  const copyButton = page.getByRole('button', { name: 'Sao chép câu trả lời' });
  const communityButton = page.getByRole('button', { name: 'Hỏi cộng đồng' });
  await expect(copyButton).toBeVisible();
  await expect(communityButton).toBeVisible();
  await expect(page.locator('.chat-msg__ai-avatar-img')).toBeVisible();
  await expect(copyButton).toHaveCSS('display', 'flex');
  await expect(copyButton).toHaveCSS('border-radius', '6px');
  await expect(communityButton).toHaveCSS('display', 'flex');
  await expect(communityButton).toHaveCSS('border-radius', '6px');
  await expect(page.locator('.chat-msg--assistant .chat-msg__bubble')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  const steps = page.getByText('Tiến trình xử lý');
  await expect(steps.locator('..')).toHaveCSS('display', 'flex');
  await steps.click();
  await expect(page.getByText('Không có tài liệu được phép sử dụng.')).toBeVisible();
  if (process.env.CHAT_STYLE_PREVIEW_PATH) {
    await page.screenshot({ path: process.env.CHAT_STYLE_PREVIEW_PATH, fullPage: true });
  }
});

test('should keep assistant actions within the viewport on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/e2e/fixtures/chat-message-preview.html');

  const actions = page.locator('.chat-msg__actions');
  await expect(actions).toHaveCSS('flex-wrap', 'wrap');
  await expect(page.getByRole('button', { name: 'Hỏi cộng đồng' })).toBeVisible();
  const actionBounds = await actions.boundingBox();

  expect(actionBounds).not.toBeNull();
  expect(actionBounds!.x + actionBounds!.width).toBeLessThanOrEqual(390);
});
