import { expect, test } from '@playwright/test';
import { HIVE_MODEL, installHiveScenario, WORKSPACE_ID } from './fixtures/hive-scenario';

test('should run explicit Hive diagnostics independently of historical filters', async ({ page }) => {
  const scenario = await installHiveScenario(page);
  await page.goto('/admin/ai-studio');
  await expect(page.getByText(/Nhà cung cấp đang hoạt động: hive/)).toContainText(HIVE_MODEL);
  expect(scenario.calls.filter((call) => call.path.endsWith('/test-key'))).toHaveLength(0);
  await page.getByRole('combobox', { name: 'API key', exact: true }).selectOption('gemini-primary');
  await page.getByRole('combobox', { name: 'Mô hình', exact: true }).selectOption('gemini-2.5-flash');
  await expect(page.getByLabel('Khóa kiểm tra')).toHaveValue('');
  await page.getByLabel('Khóa kiểm tra').selectOption('hive-primary');
  await page.getByLabel('Mô hình kiểm tra').selectOption(HIVE_MODEL);
  await expect(page.getByText(/tiêu thụ tín dụng/)).toBeVisible();
  await page.getByRole('button', { name: 'Kiểm tra API key' }).click();
  await expect(page.getByText(/HEALTHY · Sinh nội dung/)).toBeVisible();
  expect(scenario.calls.find((call) => call.path.endsWith('/test-key'))?.body).toEqual({ keyId: 'hive-primary' });
  await page.getByLabel('Prompt trực tiếp').fill('Xin chào');
  await page.getByRole('button', { name: 'Gửi prompt' }).click();
  await expect(page.getByText('Xin chào từ Hive')).toBeVisible();
  expect(scenario.calls.find((call) => call.path.endsWith('/quick-prompt'))?.body).toEqual({ keyId: 'hive-primary', model: HIVE_MODEL, prompt: 'Xin chào' });
});

test('should confirm drain verify and reopen explicitly with current counts', async ({ page }) => {
  const scenario = await installHiveScenario(page);
  await page.goto('/admin/ai-studio');
  await page.getByRole('button', { name: 'Chuyển sang DRAINING' }).click();
  expect(scenario.calls.filter((call) => call.method === 'PUT')).toHaveLength(0);
  await page.getByRole('button', { name: 'Xác nhận thay đổi' }).click();
  await expect(page.getByText(/Trạng thái: DRAINING/)).toBeVisible();
  await page.getByRole('button', { name: 'Chuyển sang VERIFYING' }).click();
  await page.getByRole('button', { name: 'Xác nhận thay đổi' }).click();
  await expect(page.getByText(/Trạng thái: VERIFYING/)).toBeVisible();
  expect(scenario.admission.state).toBe('VERIFYING');
  await page.getByRole('button', { name: 'Chuyển sang OPEN' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Xác nhận đã kiểm tra dịch vụ');
  await page.getByRole('button', { name: 'Xác nhận thay đổi' }).click();
  await expect(page.getByText(/Trạng thái: OPEN/)).toBeVisible();
  expect(scenario.calls.filter((call) => call.method === 'PUT').map((call) => call.body)).toEqual([
    { state: 'DRAINING', expectedVersion: 1 }, { state: 'VERIFYING', expectedVersion: 2 }, { state: 'OPEN', expectedVersion: 3 },
  ]);
});

test('should refresh stale versions and block verification while attempts remain pending', async ({ page }) => {
  const scenario = await installHiveScenario(page);
  scenario.admission.state = 'DRAINING'; scenario.conflictNextUpdate = true;
  await page.goto('/admin/ai-studio');
  await page.getByRole('button', { name: 'Chuyển sang VERIFYING' }).click();
  await page.getByRole('button', { name: 'Xác nhận thay đổi' }).click();
  await expect(page.getByRole('alert')).toContainText('Trạng thái đã thay đổi');
  await expect(page.getByRole('button', { name: 'Chuyển sang VERIFYING' })).toHaveCount(0);
  expect(scenario.calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
  expect(scenario.calls.filter((call) => call.path.endsWith('/test-key'))).toHaveLength(0);
});

test('should disable diagnostics when active provider metadata is unavailable', async ({ page }) => {
  const scenario = await installHiveScenario(page); scenario.registryAvailable = false;
  await page.goto('/admin/ai-studio');
  await page.getByLabel('Khóa kiểm tra').selectOption('hive-primary');
  await page.getByLabel('Mô hình kiểm tra').selectOption(HIVE_MODEL);
  await expect(page.getByText(/Chưa có metadata nhà cung cấp/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kiểm tra API key' })).toBeDisabled();
  expect(scenario.calls.filter((call) => call.path.endsWith('/test-key'))).toHaveLength(0);
});

test('should replace provisional chat text with the committed Hive answer', async ({ page }) => {
  const scenario = await installHiveScenario(page);
  await page.goto(`/workspaces/${WORKSPACE_ID}/chat`);
  await page.getByLabel('Câu hỏi tri thức').fill('Tài liệu giải thích RAG thế nào?');
  await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
  await expect(page.getByText('Câu trả lời có bằng chứng từ tài liệu.')).toBeVisible();
  await expect(page.getByText('Nội dung tạm', { exact: true })).toHaveCount(0);
  expect(scenario.calls.filter((call) => call.path.endsWith('/questions/stream'))).toHaveLength(1);
});

test('should present maintenance as a friendly failure without evidence-gap escalation or retries', async ({ page }) => {
  const scenario = await installHiveScenario(page); scenario.chatFailure = 'AI_MAINTENANCE';
  await page.goto(`/workspaces/${WORKSPACE_ID}/chat`);
  await page.getByLabel('Câu hỏi tri thức').fill('Tài liệu giải thích RAG thế nào?');
  await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
  await expect(page.getByRole('alert')).toContainText('Dịch vụ AI đang bảo trì');
  await expect(page.getByText('Private upstream details')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hỏi cộng đồng' })).toHaveCount(0);
  expect(scenario.calls.filter((call) => call.path.includes('/questions'))).toHaveLength(1);
});
