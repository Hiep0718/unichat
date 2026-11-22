import { expect, test } from '@playwright/test';

import { INVITE_WORKSPACE_ID, installInviteLinkScenario } from './fixtures/invite-link';

test('should issue and copy an invite link from the invite dialog and list it in settings', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const scenario = await installInviteLinkScenario(page);
  await page.goto(`/workspaces/${INVITE_WORKSPACE_ID}/settings?tab=access`);
  await expect(page.getByText('Chưa có link mời nào.')).toBeVisible();

  await page.getByRole('button', { name: /Mời thành viên/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Mời thành viên' });
  await dialog.getByRole('tab', { name: /Qua link/ }).click();
  await dialog.getByRole('button', { name: /Tạo link mời/ }).click();

  await expect(dialog.getByLabel('Link mời')).toHaveValue(/\/invite\/tok-1$/);
  await expect(dialog.getByText(/Đã sao chép link/)).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/invite\/tok-1$/);
  expect(scenario.created).toEqual([{ role: 'VIEWER', expiresInDays: 7, maxUses: 1 }]);

  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/0\/1 lượt/)).toBeVisible();
});

test('should warn before closing the dialog over a link that was not copied', async ({ page }) => {
  await installInviteLinkScenario(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
    document.execCommand = () => false;
  });
  await page.goto(`/workspaces/${INVITE_WORKSPACE_ID}/settings?tab=access`);
  await page.getByRole('button', { name: /Mời thành viên/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Mời thành viên' });
  await dialog.getByRole('tab', { name: /Qua link/ }).click();
  await dialog.getByRole('button', { name: /Tạo link mời/ }).click();
  await expect(dialog.getByText(/Chưa sao chép được tự động/)).toBeVisible();

  page.once('dialog', (confirm) => void confirm.dismiss());
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Link mời')).toHaveValue(/\/invite\/tok-1$/);
});
