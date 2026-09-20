import { expect, test } from '@playwright/test';
import { TEST_USER } from './test-credentials.js';

test.describe('Automation Suite 05 — Short-term Conversation Memory & Context Compaction (ADR-021)', () => {

  const setupMockRoutes = async (page: any, streamResponses: string[]) => {
    let streamCallCount = 0;

    await page.route(/\/api\/v1\/auth\//, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-e2e-token-memory-021',
          tokenType: 'Bearer',
          user: { id: 'usr-1', email: TEST_USER.email, fullName: 'Sinh viên Nghiên cứu', systemRole: 'USER', status: 'ACTIVE' },
        }),
      });
    });

    await page.route(/\/api\/v1\/workspaces/, async (route: any) => {
      const url = route.request().url();
      if (url.includes('/stream')) {
        const currentBody = streamResponses[streamCallCount] || streamResponses[streamResponses.length - 1];
        streamCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: currentBody,
        });
      } else if (url.includes('/conversations')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: [], totalElements: 0 }),
        });
      } else if (url.includes('/discussions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: [], totalElements: 0 }),
        });
      } else if (url.includes('/ws-memory-lab')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ws-memory-lab',
            name: 'Phòng thí nghiệm AI',
            description: 'Nghiên cứu Multi-turn Conversation & Context Window Compaction',
            visibility: 'PRIVATE',
            documentCount: 5,
            memberCount: 8,
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
                id: 'ws-memory-lab',
                name: 'Phòng thí nghiệm AI',
                description: 'Nghiên cứu Multi-turn Conversation & Context Window Compaction',
                visibility: 'PRIVATE',
                documentCount: 5,
                memberCount: 8,
                updatedAt: new Date().toISOString(),
              },
            ],
            totalElements: 1,
            totalPages: 1,
          }),
        });
      }
    });
  };

  const loginAndNavigateToChat = async (page: any) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"], input[name="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/workspaces/, { timeout: 10000 });

    const wsCard = page.locator('.workspace-card', { hasText: 'Phòng thí nghiệm AI' }).first();
    await expect(wsCard).toBeVisible({ timeout: 10000 });
    await wsCard.click();

    const chatNavBtn = page.locator('.side-nav__item', { hasText: 'Trò chuyện' }).first();
    await expect(chatNavBtn).toBeVisible({ timeout: 10000 });
    await chatNavBtn.click();

    await expect(page.locator('.chat-input-form__field')).toBeVisible({ timeout: 10000 });
  };

  test('should support multi-turn conversation flow with short-term context continuity', async ({ page }) => {
    // Arrange: Mock SSE streams for Turn 1 (OOP intro) and Turn 2 (Ambiguous follow-up)
    const turn1Sse = [
      'event: thought',
      'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Đã phân tích ý định (Phân loại: DEFINITION)"}',
      '',
      'event: thought',
      'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Đã quét kho tài liệu Vector DB, bóc tách 2 trích dẫn"}',
      '',
      'event: thought',
      'data: {"stepIndex":3,"stepKey":"SYNTHESIS","title":"Synthesizing Key Concepts","detail":"Đang tổng hợp dữ liệu..."}',
      '',
      'event: metadata',
      'data: {"conversationId":"conv-mem-session-01","decision":"ANSWER","intent":"DEFINITION","citations":[{"citationId":"1","documentId":"doc-oop-01","fileName":"GiaoTrinhOOP.pdf","locator":"Trang 12","excerpt":"OOP là lập trình hướng đối tượng...","score":0.95}],"providerModel":"gemini-2.5-flash"}',
      '',
      'event: token',
      'data: {"delta":"Lập trình hướng đối tượng (OOP) là phương pháp lập trình dựa trên các đối tượng [1]."}',
      '',
      'event: done',
      'data: {"messageId":"msg-turn-1-done","conversationId":"conv-mem-session-01"}',
      '',
      '',
    ].join('\n');

    const turn2Sse = [
      'event: thought',
      'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Phát hiện đại từ ngữ cảnh: Tiếp tục mạch hội thoại"}',
      '',
      'event: thought',
      'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Đã quét trích dẫn bổ trợ cho thuộc tính"}',
      '',
      'event: metadata',
      'data: {"conversationId":"conv-mem-session-01","decision":"ANSWER","intent":"FACT","citations":[{"citationId":"2","documentId":"doc-oop-02","fileName":"GiaoTrinhOOP.pdf","locator":"Trang 15","excerpt":"4 tính chất: Đóng gói, Kế thừa, Đa hình, Trừu tượng...","score":0.98}],"providerModel":"gemini-2.5-flash"}',
      '',
      'event: token',
      'data: {"delta":"Nó bao gồm 4 tính chất cốt lõi: Đóng gói (Encapsulation), Kế thừa (Inheritance), Đa hình (Polymorphism) và Trừu tượng (Abstraction) [2]."}',
      '',
      'event: done',
      'data: {"messageId":"msg-turn-2-done","conversationId":"conv-mem-session-01"}',
      '',
      '',
    ].join('\n');

    await setupMockRoutes(page, [turn1Sse, turn2Sse]);
    await loginAndNavigateToChat(page);

    const chatInput = page.locator('.chat-input-form__field');
    const sendBtn = page.locator('.chat-input-form__submit-btn');

    // Act: Turn 1 - Ask foundational question
    const q1 = 'Khái niệm Lập trình hướng đối tượng OOP là gì?';
    await chatInput.fill(q1);
    await sendBtn.click();

    // Assert: Turn 1 response renders
    await expect(page.locator('.chat-msg--user', { hasText: q1 })).toBeVisible({ timeout: 5000 });
    const assistantMsg1 = page.locator('.chat-msg--assistant').first();
    await expect(assistantMsg1).toBeVisible({ timeout: 10000 });
    await expect(assistantMsg1.locator('.chat-msg__markdown')).toContainText('Lập trình hướng đối tượng (OOP)', { timeout: 10000 });

    // Act: Turn 2 - Ask follow-up question referencing ambiguous pronoun
    const q2 = 'Nó có những tính chất cốt lõi nào?';
    await chatInput.fill(q2);
    await sendBtn.click();

    // Assert: Turn 2 renders in multi-turn sequence
    await expect(page.locator('.chat-msg--user', { hasText: q2 })).toBeVisible({ timeout: 5000 });
    const assistantMsg2 = page.locator('.chat-msg--assistant').nth(1);
    await expect(assistantMsg2).toBeVisible({ timeout: 10000 });
    await expect(assistantMsg2.locator('.chat-msg__markdown')).toContainText('Đóng gói (Encapsulation)', { timeout: 10000 });
    await expect(assistantMsg2.locator('.chat-msg__markdown')).toContainText('Đa hình (Polymorphism)');
  });

  test('should display COMPACTION thought step in NotebookLM Thoughts Accordion when context limit is approached', async ({ page }) => {
    // Arrange: Mock SSE stream emitting COMPACTION thought event
    const compactionSse = [
      'event: thought',
      'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Đã phân tích ý định truy vấn"}',
      '',
      'event: thought',
      'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Đã quét 4 khối tri thức tương đồng"}',
      '',
      'event: thought',
      'data: {"stepIndex":3,"stepKey":"COMPACTION","title":"Compacting Conversation Context","detail":"Đang tóm tắt lịch sử hội thoại để tối ưu ngữ cảnh..."}',
      '',
      'event: thought',
      'data: {"stepIndex":4,"stepKey":"SYNTHESIS","title":"Synthesizing Key Concepts","detail":"Đang tổng hợp tri thức với LLM..."}',
      '',
      'event: metadata',
      'data: {"conversationId":"conv-compact-01","decision":"ANSWER","intent":"FACT","compactedSummary":"[Tóm tắt]: Hội thoại đã trao đổi về kiến trúc microservices và message broker.","citations":[],"providerModel":"gemini-2.5-flash"}',
      '',
      'event: token',
      'data: {"delta":"Sau khi nén ngữ cảnh hội thoại, hệ thống tiếp tục tổng hợp bài học kiến trúc."}',
      '',
      'event: done',
      'data: {"messageId":"msg-compact-done","conversationId":"conv-compact-01"}',
      '',
      '',
    ].join('\n');

    await setupMockRoutes(page, [compactionSse]);
    await loginAndNavigateToChat(page);

    // Act: Submit question that triggers compaction
    const chatInput = page.locator('.chat-input-form__field');
    await chatInput.fill('Hãy tóm tắt ưu nhược điểm của kiến trúc Microservices');
    await page.locator('.chat-input-form__submit-btn').click();

    // Assert: Assistant message and thoughts accordion appear
    const assistantMsg = page.locator('.chat-msg--assistant').first();
    await expect(assistantMsg).toBeVisible({ timeout: 10000 });

    const thoughtsHeader = assistantMsg.locator('.chat-thoughts__header');
    await expect(thoughtsHeader).toBeVisible({ timeout: 10000 });
    await expect(thoughtsHeader).toContainText('Thoughts (Quá trình Suy luận AI)');

    // Act: Toggle accordion open
    await thoughtsHeader.click();

    // Assert: COMPACTION step is rendered inside the Thoughts accordion
    const compactionStep = assistantMsg.locator('.chat-thoughts__step', { hasText: 'Compacting Conversation Context' });
    await expect(compactionStep).toBeVisible({ timeout: 5000 });
    await expect(compactionStep).toContainText('Đang tóm tắt lịch sử hội thoại để tối ưu ngữ cảnh...');

    // Assert: Final answer is displayed
    const markdownZone = assistantMsg.locator('.chat-msg__markdown');
    await expect(markdownZone).toContainText('Sau khi nén ngữ cảnh hội thoại', { timeout: 10000 });
  });

  test('should handle post-compaction subsequent turns with compactedSummary smoothly', async ({ page }) => {
    // Arrange: Turn with compactedSummary followed by normal turn
    const turn1Compacted = [
      'event: thought',
      'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Phân tích ý định"}',
      '',
      'event: thought',
      'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Quét kho tài liệu"}',
      '',
      'event: thought',
      'data: {"stepIndex":3,"stepKey":"COMPACTION","title":"Compacting Conversation Context","detail":"Đang tóm tắt lịch sử hội thoại để tối ưu ngữ cảnh..."}',
      '',
      'event: metadata',
      'data: {"conversationId":"conv-session-retained","decision":"ANSWER","intent":"FACT","compactedSummary":"Cuộc trò chuyện đã thảo luận về OOP và Spring Boot.","citations":[],"providerModel":"gemini-2.5-flash"}',
      '',
      'event: token',
      'data: {"delta":"Đã cập nhật tóm tắt hội thoại thành công."}',
      '',
      'event: done',
      'data: {"messageId":"msg-1","conversationId":"conv-session-retained"}',
      '',
      '',
    ].join('\n');

    const turn2Subsequent = [
      'event: thought',
      'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Phân tích câu hỏi tiếp theo"}',
      '',
      'event: thought',
      'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Quét tri thức"}',
      '',
      'event: metadata',
      'data: {"conversationId":"conv-session-retained","decision":"ANSWER","intent":"FACT","citations":[],"providerModel":"gemini-2.5-flash"}',
      '',
      'event: token',
      'data: {"delta":"Câu trả lời cho lượt tiếp theo vẫn tiếp tục mạch lạc."}',
      '',
      'event: done',
      'data: {"messageId":"msg-2","conversationId":"conv-session-retained"}',
      '',
      '',
    ].join('\n');

    await setupMockRoutes(page, [turn1Compacted, turn2Subsequent]);
    await loginAndNavigateToChat(page);

    const chatInput = page.locator('.chat-input-form__field');
    const sendBtn = page.locator('.chat-input-form__submit-btn');

    // Turn 1
    await chatInput.fill('Câu hỏi tạo compaction');
    await sendBtn.click();
    await expect(page.locator('.chat-msg--assistant').first()).toContainText('Đã cập nhật tóm tắt hội thoại', { timeout: 10000 });

    // Turn 2
    await chatInput.fill('Câu hỏi lượt tiếp theo');
    await sendBtn.click();
    await expect(page.locator('.chat-msg--assistant').nth(1)).toContainText('tiếp tục mạch lạc', { timeout: 10000 });

    // Both messages persist in conversation view
    await expect(page.locator('.chat-msg--user')).toHaveCount(2);
    await expect(page.locator('.chat-msg--assistant')).toHaveCount(2);
  });
});
