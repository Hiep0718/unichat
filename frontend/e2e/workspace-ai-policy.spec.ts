import { expect, test } from '@playwright/test';

import { installWorkspacePolicyScenario, POLICY_WORKSPACE_ID } from './fixtures/workspace-ai-policy';

test('should require explicit owner saving and retain the new version across enable disable and metadata updates', async ({ page }) => {
  const scenario = await installWorkspacePolicyScenario(page);
  await page.goto(`/workspaces/${POLICY_WORKSPACE_ID}/settings`);
  await page.getByRole('tab', { name: 'AI & Quyền riêng tư' }).click();
  await expect(page.getByRole('checkbox', { name: 'Cho phép xử lý bằng AI' })).not.toBeChecked();
  expect(scenario.updates).toEqual([]);
  await page.getByRole('checkbox').check();
  expect(scenario.updates).toEqual([]);
  await page.getByRole('button', { name: 'Lưu quyền AI' }).click();
  await expect(page.getByText('Trạng thái đã lưu: Đã cho phép')).toBeVisible();
  await page.getByRole('checkbox').uncheck();
  await page.getByRole('button', { name: 'Lưu quyền AI' }).click();
  await expect(page.getByText('Trạng thái đã lưu: Chưa cho phép')).toBeVisible();
  await page.getByRole('tab', { name: 'Thông tin chung' }).click();
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Cập nhật thông tin thành công.')).toBeVisible();
  expect(scenario.updates).toEqual([
    { cloudAllowed: true, expectedVersion: 3 }, { cloudAllowed: false, expectedVersion: 4 },
    { name: 'Nhóm nghiên cứu', description: '', expectedVersion: 5 },
  ]);
});

test('should display a read-only policy to editors without a save action', async ({ page }) => {
  const scenario = await installWorkspacePolicyScenario(page, 'EDITOR');
  await page.goto(`/workspaces/${POLICY_WORKSPACE_ID}/settings`);
  await page.getByRole('tab', { name: 'AI & Quyền riêng tư' }).click();
  await expect(page.getByRole('checkbox')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Lưu quyền AI' })).toHaveCount(0);
  expect(scenario.updates).toEqual([]);
});

test('should refresh a stale version and wait for another explicit owner save after conflict', async ({ page }) => {
  const scenario = await installWorkspacePolicyScenario(page);
  scenario.conflictNextSave = true;
  await page.goto(`/workspaces/${POLICY_WORKSPACE_ID}/settings`);
  await page.getByRole('tab', { name: 'AI & Quyền riêng tư' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Lưu quyền AI' }).click();
  await expect(page.getByRole('alert')).toContainText('Workspace đã thay đổi');
  await expect(page.getByText('Đã lưu quyền xử lý bằng AI.')).toHaveCount(0);
  await expect(page.getByText('Trạng thái đã lưu: Chưa cho phép')).toBeVisible();
  expect(scenario.updates).toHaveLength(1);
  await page.getByRole('button', { name: 'Lưu quyền AI' }).click();
  await expect(page.getByText('Trạng thái đã lưu: Đã cho phép')).toBeVisible();
  expect(scenario.updates[1]).toEqual({ cloudAllowed: true, expectedVersion: 4 });
});
