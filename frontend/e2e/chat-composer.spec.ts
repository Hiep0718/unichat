import { expect, test } from '@playwright/test';
import { installHiveScenario, WORKSPACE_ID } from './fixtures/hive-scenario';

test.use(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});

test('should present contextual composer without hardcoded summary button and route natural-language summary', async ({ page }) => {
  const scenario = await installHiveScenario(page);
  await page.route(`**/api/v1/workspaces/${WORKSPACE_ID}/documents**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: Array.from({ length: 6 }, (_, index) => ({
          id: `00000000-0000-4000-8000-00000000000${index + 1}`,
          workspaceId: WORKSPACE_ID,
          storageKey: `doc-${index + 1}.pdf`,
          originalName: `tai-lieu-${index + 1}.pdf`,
          mediaType: 'application/pdf',
          byteSize: 1024,
          sha256: 'a'.repeat(64),
          status: 'PROCESSED',
          ingestionVersion: 1,
          pageOrBlockCount: 10,
          version: 1,
          createdAt: '2026-10-30T00:00:00Z',
          updatedAt: '2026-10-30T00:00:00Z',
          uploadedBy: null,
          uploadedByEmail: null,
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null,
          contributionSummary: null,
          contributionReason: null,
        })),
        number: 0,
        size: 20,
        totalElements: 6,
        totalPages: 1,
      }),
    });
  });

  await page.route(`**/api/v1/workspaces/${WORKSPACE_ID}/questions/stream`, async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    scenario.calls.push({ path: new URL(route.request().url()).pathname, method: 'POST', body });
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        operationId: '33333333-3333-4333-8333-333333333333',
        conversationId: '22222222-2222-4222-8222-222222222222',
        taskType: 'WORKSPACE_SUMMARY',
        state: 'RUNNING',
      }),
    });
  });

  await page.route(`**/api/v1/workspaces/${WORKSPACE_ID}/chat-operations/33333333-3333-4333-8333-333333333333`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        operationId: '33333333-3333-4333-8333-333333333333',
        conversationId: '22222222-2222-4222-8222-222222222222',
        taskType: 'WORKSPACE_SUMMARY',
        state: 'COMPLETED',
        result: null,
        errorCode: null,
        summaryResult: {
          summaryId: '44444444-4444-4444-8444-444444444444',
          messageId: '55555555-5555-4555-8555-555555555555',
          overview: 'Bản tóm tắt toàn diện cho 6 tài liệu trong nhóm nghiên cứu.',
          crossDocumentInsights: [],
          documentCount: 6,
          processedChunkCount: 48,
        },
      }),
    });
  });

  await page.goto(`/workspaces/${WORKSPACE_ID}/chat`);

  const questionField = page.getByLabel('Câu hỏi tri thức');
  await expect(questionField).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Tóm tắt toàn bộ tài liệu', exact: true })).toHaveCount(0);
  await expect(page.getByText('6 nguồn tài liệu')).toBeVisible();
  await expect(questionField).toHaveAttribute('placeholder', /Nhóm nghiên cứu/);
  await expect(page.getByRole('radio', { name: 'Chỉ tài liệu' })).toHaveAttribute('aria-checked', 'true');

  await questionField.fill('Tóm tắt toàn bộ tài liệu');
  await questionField.press('Enter');

  await expect(page.getByText('Bản tóm tắt toàn diện cho 6 tài liệu trong nhóm nghiên cứu.')).toBeVisible();

  const streamCall = scenario.calls.find((call) => call.path.endsWith('/questions/stream'));
  expect(streamCall?.body).toEqual({
    question: 'Tóm tắt toàn bộ tài liệu',
    allowExternalKnowledge: false,
  });
});

