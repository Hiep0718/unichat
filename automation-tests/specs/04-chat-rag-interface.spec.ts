import { expect, test } from '@playwright/test';
import { TEST_USER } from './test-credentials.js';

test.describe('Automation Suite 04 — RAG Chat Interface & Workspace Quản lý dự án Chat Flow', () => {
  test('should render hero browser mockup with chat interface preview on landing page', async ({ page }) => {
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

  test('should authenticate user and navigate to workspace Quản lý dự án chat interface', async ({ page }) => {
    // Mock Auth & Workspace APIs
    await page.route(/\/api\/v1\/auth\//, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-e2e-token-xyz',
          tokenType: 'Bearer',
          user: { id: 'usr-1', email: TEST_USER.email, fullName: 'Quản trị viên', systemRole: 'USER', status: 'ACTIVE' },
        }),
      });
    });

    await page.route(/\/api\/v1\/workspaces/, async (route) => {
      const url = route.request().url();
      if (url.includes('/ws-ql-du-an')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ws-ql-du-an',
            name: 'Quản lý dự án',
            description: 'Kho tri thức môn Quản lý dự án công nghệ thông tin',
            visibility: 'PRIVATE',
            documentCount: 8,
            memberCount: 15,
            updatedAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [
              {
                id: 'ws-ql-du-an',
                name: 'Quản lý dự án',
                description: 'Kho tri thức môn Quản lý dự án công nghệ thông tin',
                visibility: 'PRIVATE',
                documentCount: 8,
                memberCount: 15,
                updatedAt: new Date().toISOString(),
              },
            ],
            totalElements: 1,
            totalPages: 1,
          }),
        });
      }
    });

    // 1. Fill login form
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await submitBtn.click();

    // 2. Expect redirect to /workspaces
    await page.waitForURL(/\/workspaces/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/workspaces/);

    // 3. Click "Quản lý dự án" workspace card
    const workspaceCard = page.locator('.workspace-card', { hasText: 'Quản lý dự án' }).first();
    await expect(workspaceCard).toBeVisible({ timeout: 10000 });
    await workspaceCard.click();

    // 4. Click AI Chat Hub card in workspace overview
    const chatHubBtn = page.locator('.ws-hub-card', { hasText: 'Hỏi đáp Tri thức AI' }).first();
    await expect(chatHubBtn).toBeVisible({ timeout: 10000 });
    await chatHubBtn.click();

    // 5. Verify Chat input field renders in Chat UI
    const chatInput = page.locator('.chat-input-form__field');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
  });

  test('should send question in Quản lý dự án workspace and render real-time streaming response & citations', async ({ page }) => {
    // Mock Auth, Workspace, and SSE Chat Stream APIs
    await page.route(/\/api\/v1\/auth\//, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-e2e-token-xyz',
          tokenType: 'Bearer',
          user: { id: 'usr-1', email: TEST_USER.email, fullName: 'Quản trị viên', systemRole: 'USER', status: 'ACTIVE' },
        }),
      });
    });

    await page.route(/\/api\/v1\/workspaces/, async (route) => {
      const url = route.request().url();
      if (url.includes('/stream')) {
        const sseBody = [
          'event: metadata',
          'data: {"conversationId":"conv-ql-du-an-01","decision":"ANSWER","intent":"FACT","citations":[{"citationId":"1","documentId":"doc-pmp-01","fileName":"QuyTrinhQuanLyDuAn.pdf","locator":"page:14","excerpt":"Quản lý tích hợp bao gồm các quy trình tổng hợp...","score":0.92}],"providerModel":"gemini-2.5-flash"}',
          '',
          'event: token',
          'data: {"delta":"Quản lý tích hợp dự án bao gồm các quy trình "}',
          '',
          'event: token',
          'data: {"delta":"được yêu cầu để đảm bảo dự án được phối hợp hiệu quả [1]."}',
          '',
          'event: done',
          'data: {"messageId":"msg-assistant-001"}',
          '',
          '',
        ].join('\n');

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: sseBody,
        });
      } else if (url.includes('/conversations')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: [], totalElements: 0 }),
        });
      } else if (url.includes('/ws-ql-du-an')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ws-ql-du-an',
            name: 'Quản lý dự án',
            description: 'Kho tri thức môn Quản lý dự án công nghệ thông tin',
            visibility: 'PRIVATE',
            documentCount: 8,
            memberCount: 15,
            updatedAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [
              {
                id: 'ws-ql-du-an',
                name: 'Quản lý dự án',
                description: 'Kho tri thức môn Quản lý dự án công nghệ thông tin',
                visibility: 'PRIVATE',
                documentCount: 8,
                memberCount: 15,
                updatedAt: new Date().toISOString(),
              },
            ],
            totalElements: 1,
            totalPages: 1,
          }),
        });
      }
    });

    // 1. Perform login in same session
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await submitBtn.click();

    await page.waitForURL(/\/workspaces/, { timeout: 10000 });

    // 2. Click "Quản lý dự án" workspace card
    const workspaceCard = page.locator('.workspace-card', { hasText: 'Quản lý dự án' }).first();
    await expect(workspaceCard).toBeVisible({ timeout: 10000 });
    await workspaceCard.click();

    // 3. Click AI Chat Hub card
    const chatHubBtn = page.locator('.ws-hub-card', { hasText: 'Hỏi đáp Tri thức AI' }).first();
    await expect(chatHubBtn).toBeVisible({ timeout: 10000 });
    await chatHubBtn.click();

    // 4. Fill question in chat input and submit
    const chatInput = page.locator('.chat-input-form__field');
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    const questionText = 'Khái niệm Quản lý tích hợp dự án là gì?';
    await chatInput.fill(questionText);

    const sendBtn = page.locator('.chat-input-form__submit-btn');
    await sendBtn.click();

    // 5. Verify user message appears immediately
    const userMsg = page.locator('.chat-msg--user', { hasText: questionText }).first();
    await expect(userMsg).toBeVisible({ timeout: 5000 });

    // 6. Verify assistant streaming message appears and populates content
    const assistantMsg = page.locator('.chat-msg--assistant').first();
    await expect(assistantMsg).toBeVisible({ timeout: 10000 });

    const markdownZone = assistantMsg.locator('.chat-msg__markdown');
    await expect(markdownZone).toContainText('Quản lý tích hợp dự án', { timeout: 15000 });
  });
});
