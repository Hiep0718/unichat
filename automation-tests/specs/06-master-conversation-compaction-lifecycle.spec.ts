import { expect, test } from '@playwright/test';
import { TEST_USER } from './test-credentials.js';

test.describe('Automation Suite 06 — Master E2E Lifecycle: Short-term Conversation Memory & Compaction (ADR-021)', () => {

  const setupMasterMockRoutes = async (page: any) => {
    let streamCallCount = 0;

    // 4 realistic multi-turn SSE streams modeling an interactive research session
    const streams = [
      // Turn 1: Cold start foundational query
      [
        'event: thought',
        'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Phân tích ý định (DEFINITION / ARCHITECTURE): Bóc tách từ khóa Microservices, Message Broker"}',
        '',
        'event: thought',
        'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Quét kho tài liệu Vector DB, trích xuất 2 khối tri thức uy tín từ Kiến Trúc Phần Mềm"}',
        '',
        'event: thought',
        'data: {"stepIndex":3,"stepKey":"SYNTHESIS","title":"Synthesizing Key Concepts","detail":"Đang tổng hợp kiến trúc hệ thống và lập luận phân tán..."}',
        '',
        'event: thought',
        'data: {"stepIndex":4,"stepKey":"GENERATION","title":"Verifying Citations & Formatting Output","detail":"Đã kiểm định trích dẫn [1], [2], tiến hành stream câu trả lời..."}',
        '',
        'event: metadata',
        'data: {"conversationId":"conv-master-lifecycle-001","decision":"ANSWER","intent":"DEFINITION","strategyVersion":"v1.0","evidenceScore":0.95,"citations":[{"citationId":"1","documentId":"doc-arch-01","fileName":"KienTrucMicroservices.pdf","locator":"page:14","excerpt":"Kiến trúc Microservices chia nhỏ ứng dụng thành các dịch vụ độc lập có ranh giới ngữ cảnh rõ ràng.","score":0.96},{"citationId":"2","documentId":"doc-broker-02","fileName":"RabbitMQThucChien.pdf","locator":"page:28","excerpt":"Message Broker đóng vai trò trung gian định tuyến thông điệp bất đồng bộ an toàn và chịu lỗi cao.","score":0.92}],"providerModel":"gemini-2.5-flash"}',
        '',
        'event: token',
        'data: {"delta":"### 1. Khái niệm & Kiến trúc Microservices\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"Kiến trúc **Microservices** là phương pháp phân rã hệ thống thành các dịch vụ nhỏ, độc lập [1].\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"### 2. Cơ chế giao tiếp qua Message Broker\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"Các dịch vụ trao đổi thông điệp bất đồng bộ (Asynchronous Messaging) thông qua **RabbitMQ** để đảm bảo tính sẵn sàng cao [2].\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"Độ trễ trung bình hệ thống được biểu diễn qua công thức:\\n\\n$$Latency = T_{queue} + T_{processing}$$\\n\\n"}',
        '',
        'event: done',
        'data: {"messageId":"msg-master-turn-1","conversationId":"conv-master-lifecycle-001"}',
        '',
        '',
      ].join('\n'),

      // Turn 2: Ambiguous pronoun follow-up ("Nó có ưu điểm gì...")
      [
        'event: thought',
        'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Phát hiện đại từ ngữ cảnh \\"Nó\\": Tự động phân giải tham chiếu đến Microservices & Message Broker (Bypass CLARIFY theo ADR-021)"}',
        '',
        'event: thought',
        'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Truy xuất bằng chứng so sánh đối ứng giữa Microservices và Monolithic"}',
        '',
        'event: thought',
        'data: {"stepIndex":3,"stepKey":"SYNTHESIS","title":"Synthesizing Key Concepts","detail":"Đang đối chiếu các trụ cột: Scalability, Fault Tolerance, Deployment"}',
        '',
        'event: thought',
        'data: {"stepIndex":4,"stepKey":"GENERATION","title":"Verifying Citations & Formatting Output","detail":"Hoàn thiện trích dẫn [1] và chuẩn bị xuất văn bản..."}',
        '',
        'event: metadata',
        'data: {"conversationId":"conv-master-lifecycle-001","decision":"ANSWER","intent":"COMPARISON","strategyVersion":"v1.0","evidenceScore":0.98,"citations":[{"citationId":"1","documentId":"doc-compare-03","fileName":"MicroservicesPatterns.pdf","locator":"page:42","excerpt":"So sánh Monolithic vs Microservices: Khả năng mở rộng độc lập, cô lập lỗi và triển khai liên tục CI/CD.","score":0.97}],"providerModel":"gemini-2.5-flash"}',
        '',
        'event: token',
        'data: {"delta":"### Ưu điểm vượt trội so với Monolithic\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"Khi so sánh với kiến trúc nguyên khối Monolithic, **Nó** (Kiến trúc Microservices kết hợp Message Broker) mang lại các lợi ích then chốt [1]:\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"- **Mở rộng độc lập (Independent Scalability)**: Chỉ mở rộng các dịch vụ có tải cao.\\n"}',
        '',
        'event: token',
        'data: {"delta":"- **Cô lập lỗi (Fault Isolation)**: Lỗi một service không làm sập toàn bộ hệ thống.\\n"}',
        '',
        'event: token',
        'data: {"delta":"- **Đa dạng công nghệ (Polyglot Persistence)**: Mỗi service có thể tự do chọn loại Database phù hợp."}',
        '',
        'event: done',
        'data: {"messageId":"msg-master-turn-2","conversationId":"conv-master-lifecycle-001"}',
        '',
        '',
      ].join('\n'),

      // Turn 3: Long context crossing 80% token threshold -> Triggers COMPACTION thought step & compactedSummary
      [
        'event: thought',
        'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Phân tích ý định nâng cao: Đánh giá tính nhất quán dữ liệu & Saga Pattern"}',
        '',
        'event: thought',
        'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Quét kho tài liệu về Distributed Transactions & Outbox Pattern"}',
        '',
        'event: thought',
        'data: {"stepIndex":3,"stepKey":"COMPACTION","title":"Compacting Conversation Context","detail":"Đang tóm tắt lịch sử hội thoại để tối ưu ngữ cảnh (80% token budget reached)..."}',
        '',
        'event: thought',
        'data: {"stepIndex":4,"stepKey":"SYNTHESIS","title":"Synthesizing Key Concepts","detail":"Hợp nhất lịch sử đã compact và các giải pháp Saga Orchestration"}',
        '',
        'event: thought',
        'data: {"stepIndex":5,"stepKey":"GENERATION","title":"Verifying Citations & Formatting Output","detail":"Đang stream câu trả lời đã tối ưu context window..."}',
        '',
        'event: metadata',
        'data: {"conversationId":"conv-master-lifecycle-001","decision":"ANSWER","intent":"REASONING","strategyVersion":"v1.0","evidenceScore":0.93,"compactedSummary":"[Tóm tắt phiên nghiên cứu]: Đã phân tích kiến trúc Microservices, giao tiếp RabbitMQ, so sánh ưu điểm vượt trội với Monolithic. Phiên trao đổi đang chuyển sang xử lý tính nhất quán dữ liệu phân tán.","citations":[{"citationId":"1","documentId":"doc-saga-04","fileName":"SagaPatternGuide.pdf","locator":"page:88","excerpt":"Saga Pattern giải quyết bài toán giao dịch phân tán bằng chuỗi các local transactions kèm compensating transactions.","score":0.94}],"providerModel":"gemini-2.5-flash"}',
        '',
        'event: token',
        'data: {"delta":"### Tính nhất quán dữ liệu & Saga Pattern\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"Trong hệ thống Microservices, **Saga Pattern** quản lý giao dịch phân tán thông qua chuỗi các giao dịch cục bộ [1].\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"Khi một bước gặp lỗi, hệ thống kích hoạt **Compensating Transaction** để hoàn tác trạng thái một cách tin cậy."}',
        '',
        'event: done',
        'data: {"messageId":"msg-master-turn-3","conversationId":"conv-master-lifecycle-001"}',
        '',
        '',
      ].join('\n'),

      // Turn 4: Post-compaction turn utilizing working memory and generating code block
      [
        'event: thought',
        'data: {"stepIndex":1,"stepKey":"INTENT","title":"Initiating Request & Intent Analysis","detail":"Tiếp nhận yêu cầu viết code dựa trên tóm tắt hội thoại"}',
        '',
        'event: thought',
        'data: {"stepIndex":2,"stepKey":"RETRIEVAL","title":"Retrieving & Grounding Sources","detail":"Trích xuất mẫu cài đặt RabbitTemplate trong Spring Boot"}',
        '',
        'event: thought',
        'data: {"stepIndex":3,"stepKey":"SYNTHESIS","title":"Synthesizing Key Concepts","detail":"Đang sinh code mẫu hoàn chỉnh và chú thích kỹ thuật"}',
        '',
        'event: thought',
        'data: {"stepIndex":4,"stepKey":"GENERATION","title":"Verifying Citations & Formatting Output","detail":"Đang stream mã nguồn Java..."}',
        '',
        'event: metadata',
        'data: {"conversationId":"conv-master-lifecycle-001","decision":"ANSWER","intent":"FACT","strategyVersion":"v1.0","evidenceScore":0.91,"citations":[],"providerModel":"gemini-2.5-flash"}',
        '',
        'event: token',
        'data: {"delta":"### Triển khai RabbitMQ Producer trong Spring Boot\\n\\nDưới đây là đoạn mã nguồn Java thực thi gửi thông điệp bất đồng bộ:\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"```java\\n@Service\\npublic class OrderProducer {\\n    private final RabbitTemplate rabbitTemplate;\\n\\n    public void sendOrder(OrderEvent event) {\\n        rabbitTemplate.convertAndSend(\\"order.exchange\\", \\"order.created\\", event);\\n    }\\n}\\n```\\n\\n"}',
        '',
        'event: token',
        'data: {"delta":"Đoạn mã trên tự động định tuyến sự kiện sang Queue theo cấu hình Exchange."}',
        '',
        'event: done',
        'data: {"messageId":"msg-master-turn-4","conversationId":"conv-master-lifecycle-001"}',
        '',
        '',
      ].join('\n'),
    ];

    await page.route(/\/api\/v1\/auth\//, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'test-master-token-xyz',
          tokenType: 'Bearer',
          user: { id: 'usr-senior', email: TEST_USER.email, fullName: 'Kỹ sư Trưởng', systemRole: 'USER', status: 'ACTIVE' },
        }),
      });
    });

    await page.route(/\/api\/v1\/workspaces/, async (route: any) => {
      const url = route.request().url();
      if (url.includes('/stream')) {
        const body = streams[streamCallCount] || streams[streams.length - 1];
        streamCallCount++;
        await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
      } else if (url.includes('/conversations')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) });
      } else if (url.includes('/discussions')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) });
      } else if (url.includes('/ws-software-eng-rag')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'ws-software-eng-rag',
            name: 'Kho Tri thức Kỹ thuật Phần mềm & AI',
            description: 'Phòng lab nghiên cứu kiến trúc Microservices và RAG Adaptive Reasoning',
            visibility: 'PRIVATE',
            documentCount: 12,
            memberCount: 20,
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
                id: 'ws-software-eng-rag',
                name: 'Kho Tri thức Kỹ thuật Phần mềm & AI',
                description: 'Phòng lab nghiên cứu kiến trúc Microservices và RAG Adaptive Reasoning',
                visibility: 'PRIVATE',
                documentCount: 12,
                memberCount: 20,
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

  test('should execute complete multi-turn lifecycle with pronoun resolution, compaction thought accordion, and source drawer inspection', async ({ page }) => {
    // 1. Arrange Mock Environment & Login
    await setupMasterMockRoutes(page);

    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"], input[name="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/workspaces/, { timeout: 12000 });

    const wsCard = page.locator('.workspace-card', { hasText: 'Kho Tri thức Kỹ thuật Phần mềm & AI' }).first();
    await expect(wsCard).toBeVisible({ timeout: 10000 });
    await wsCard.click();

    const chatNavBtn = page.locator('.side-nav__item', { hasText: 'Trò chuyện' }).first();
    await expect(chatNavBtn).toBeVisible({ timeout: 10000 });
    await chatNavBtn.click();

    const chatInput = page.locator('.chat-input-form__field');
    const sendBtn = page.locator('.chat-input-form__submit-btn');
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // ──────────────────────────────────────────────────────────────────────────
    // TURN 1: Cold Start Foundational Architecture Question
    // ──────────────────────────────────────────────────────────────────────────
    const q1 = 'Hãy phân tích kiến trúc Microservices và cơ chế giao tiếp qua Message Broker.';
    await chatInput.fill(q1);
    await page.waitForTimeout(600); // Visual pause for video recording
    await sendBtn.click();

    // Verify Turn 1 User & Assistant messages
    await expect(page.locator('.chat-msg--user', { hasText: q1 })).toBeVisible({ timeout: 6000 });
    const assistant1 = page.locator('.chat-msg--assistant').first();
    await expect(assistant1).toBeVisible({ timeout: 10000 });
    await expect(assistant1.locator('.chat-msg__markdown')).toContainText('Kiến trúc Microservices', { timeout: 12000 });
    await expect(assistant1.locator('.chat-msg__markdown')).toContainText('RabbitMQ');

    // Verify Citation chips in Turn 1
    const cite1 = assistant1.locator('.notebook-citation-chip', { hasText: '1' });
    await expect(cite1).toBeVisible({ timeout: 8000 });

    await page.waitForTimeout(1000); // Cinematic pause for video clarity

    // ──────────────────────────────────────────────────────────────────────────
    // TURN 2: Ambiguous Pronoun Query ("Nó có ưu điểm gì...")
    // ──────────────────────────────────────────────────────────────────────────
    const q2 = 'Nó có ưu điểm gì vượt trội so với Monolithic truyền thống?';
    await chatInput.fill(q2);
    await page.waitForTimeout(600);
    await sendBtn.click();

    // Verify Turn 2 messages
    await expect(page.locator('.chat-msg--user', { hasText: q2 })).toBeVisible({ timeout: 6000 });
    const assistant2 = page.locator('.chat-msg--assistant').nth(1);
    await expect(assistant2).toBeVisible({ timeout: 10000 });
    await expect(assistant2.locator('.chat-msg__markdown')).toContainText('Mở rộng độc lập', { timeout: 12000 });
    await expect(assistant2.locator('.chat-msg__markdown')).toContainText('Cô lập lỗi');

    // Inspect Citation Chip [1] and open Citation Drawer
    const citeTurn2 = assistant2.locator('.notebook-citation-chip', { hasText: '1' });
    await expect(citeTurn2).toBeVisible({ timeout: 8000 });
    await citeTurn2.click();

    // Verify Citation Drawer opens with document details
    const drawer = page.locator('.citation-drawer');
    await expect(drawer).toBeVisible({ timeout: 8000 });
    await expect(drawer.locator('.citation-drawer__filename')).toContainText('MicroservicesPatterns.pdf');
    await page.waitForTimeout(1200); // Visual pause to show drawer in recording

    // Close Citation Drawer
    const closeDrawerBtn = drawer.locator('.citation-drawer__close-btn');
    await closeDrawerBtn.click();
    await expect(drawer).not.toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(800);

    // ──────────────────────────────────────────────────────────────────────────
    // TURN 3: Context Window Compaction & Thoughts Accordion Inspection
    // ──────────────────────────────────────────────────────────────────────────
    const q3 = 'Hãy tóm tắt và đánh giá tính nhất quán dữ liệu, Saga Pattern và Outbox Pattern khi mở rộng quy mô lớn.';
    await chatInput.fill(q3);
    await page.waitForTimeout(600);
    await sendBtn.click();

    // Verify Turn 3 messages
    await expect(page.locator('.chat-msg--user', { hasText: q3 })).toBeVisible({ timeout: 6000 });
    const assistant3 = page.locator('.chat-msg--assistant').nth(2);
    await expect(assistant3).toBeVisible({ timeout: 10000 });
    await expect(assistant3.locator('.chat-msg__markdown')).toContainText('Saga Pattern', { timeout: 12000 });

    // Open Thoughts Accordion to inspect COMPACTION thought step
    const thoughtsHeader = assistant3.locator('.chat-thoughts__header');
    await expect(thoughtsHeader).toBeVisible({ timeout: 8000 });
    await thoughtsHeader.click(); // Expand accordion

    // Verify COMPACTION thought step details
    const compactionStep = assistant3.locator('.chat-thoughts__step', { hasText: 'Compacting Conversation Context' });
    await expect(compactionStep).toBeVisible({ timeout: 6000 });
    await expect(compactionStep).toContainText('Đang tóm tắt lịch sử hội thoại');

    await page.waitForTimeout(1500); // Visual pause to highlight compaction step in recording

    // ──────────────────────────────────────────────────────────────────────────
    // TURN 4: Post-Compaction Code Generation & Action Controls
    // ──────────────────────────────────────────────────────────────────────────
    const q4 = 'Dựa vào tóm tắt trước đó, hãy viết một đoạn mã Java Spring Boot tích hợp RabbitMQ Producer.';
    await chatInput.fill(q4);
    await page.waitForTimeout(600);
    await sendBtn.click();

    // Verify Turn 4 messages & Java Code block
    await expect(page.locator('.chat-msg--user', { hasText: q4 })).toBeVisible({ timeout: 6000 });
    const assistant4 = page.locator('.chat-msg--assistant').nth(3);
    await expect(assistant4).toBeVisible({ timeout: 10000 });
    await expect(assistant4.locator('pre code')).toBeVisible({ timeout: 12000 });
    await expect(assistant4.locator('pre code')).toContainText('RabbitTemplate');

    // Test Copy Answer Action
    const copyBtn = assistant4.locator('.chat-msg__action-btn', { hasText: 'Sao chép câu trả lời' });
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await page.waitForTimeout(500);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Final System State Verification (8 messages total, fully retained)
    // ──────────────────────────────────────────────────────────────────────────
    await expect(page.locator('.chat-msg--user')).toHaveCount(4);
    await expect(page.locator('.chat-msg--assistant')).toHaveCount(4);

    await page.waitForTimeout(2000); // Concluding pause for high-quality video finish
  });
});
