import { expect, test } from '@playwright/test';
import { TEST_USER } from './test-credentials.js';

/**
 * Files sent inside a one-to-one conversation.
 *
 * Every request is fulfilled locally, as the rest of this suite does: the flow
 * under test is the composer, the single multipart request it makes, and how the
 * resulting bubble renders — none of which needs a live backend.
 */
test.describe('Automation Suite 07 — Work Chat Attachments', () => {
  const CONVERSATION_ID = 'c0000000-0000-0000-0000-000000000001';
  const MESSAGE_ID = 'm0000000-0000-0000-0000-000000000001';
  const ATTACHMENT_ID = 'a0000000-0000-0000-0000-000000000001';

  /** A one-pixel PNG, so the browser has something real to decode. */
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );

  const conversation = {
    id: CONVERSATION_ID,
    otherUserId: 'u0000000-0000-0000-0000-000000000002',
    otherUserName: 'Minh Anh',
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
  };

  const imageAttachment = {
    id: ATTACHMENT_ID,
    kind: 'IMAGE',
    originalName: 'so-do-kien-truc.png',
    mediaType: 'image/png',
    byteSize: PNG.length,
  };

  const documentAttachment = {
    id: ATTACHMENT_ID,
    kind: 'FILE',
    originalName: 'bao-cao-tien-do.pdf',
    mediaType: 'application/pdf',
    byteSize: 3 * 1024 * 1024,
  };

  /** Bodies of the multipart sends the page made, for assertion afterwards. */
  let sentBodies: string[] = [];

  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  const setupRoutes = async (page: any, reply: Record<string, unknown>) => {
    sentBodies = [];

    // Registered first, so every more specific route below takes precedence.
    await page.route(/\/api\/v1\//, async (route: any) =>
      route.fulfill(json({ content: [], totalElements: 0, totalPages: 0 })));

    await page.route(/\/api\/v1\/auth\//, async (route: any) =>
      route.fulfill(json({
        accessToken: 'test-e2e-token-work-chat-07',
        tokenType: 'Bearer',
        user: {
          id: 'u0000000-0000-0000-0000-000000000001',
          email: TEST_USER.email,
          fullName: 'Sinh viên Nghiên cứu',
          systemRole: 'USER',
          status: 'ACTIVE',
        },
      })));

    await page.route(/\/api\/v1\/work-chat\//, async (route: any) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/attachments/') && url.endsWith('/content')) {
        return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
      }
      if (url.includes('/messages') && method === 'POST') {
        sentBodies.push(route.request().postData() ?? '');
        return route.fulfill(json(reply));
      }
      if (url.includes('/messages')) {
        return route.fulfill(json([]));
      }
      if (url.includes('/conversations')) {
        return route.fulfill(json([conversation]));
      }
      if (url.includes('/presence') || url.includes('/contacts')) {
        return route.fulfill(json([]));
      }
      return route.fulfill({ status: 204, body: '' });
    });
  };

  const message = (overrides: Record<string, unknown>) => ({
    id: MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    senderId: 'u0000000-0000-0000-0000-000000000001',
    senderName: 'Sinh viên Nghiên cứu',
    body: null,
    mine: true,
    createdAt: new Date().toISOString(),
    readAt: null,
    attachments: [],
    ...overrides,
  });

  const openConversation = async (page: any) => {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"], input[name="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/workspaces/, { timeout: 15000 });

    await page.goto(`/work-chat?conversation=${CONVERSATION_ID}`);
    await expect(page.getByLabel('Nội dung tin nhắn')).toBeVisible({ timeout: 15000 });
  };

  test('should send an image and its caption in a single request', async ({ page }) => {
    // Arrange
    await setupRoutes(page, message({
      body: 'Sơ đồ kiến trúc đây nhé',
      attachments: [imageAttachment],
    }));
    await openConversation(page);

    // Act
    await page.getByLabel('Chọn tệp để gửi').setInputFiles({
      name: 'so-do-kien-truc.png',
      mimeType: 'image/png',
      buffer: PNG,
    });
    await page.getByLabel('Nội dung tin nhắn').fill('Sơ đồ kiến trúc đây nhé');
    await page.getByLabel('Gửi').click();

    // Assert: one request carried both, so the recipient cannot be pushed a
    // bubble whose file has not been stored yet.
    await expect(page.getByAltText('so-do-kien-truc.png')).toBeVisible({ timeout: 15000 });
    expect(sentBodies).toHaveLength(1);
    expect(sentBodies[0]).toContain('so-do-kien-truc.png');
    expect(sentBodies[0]).toContain('Sơ đồ kiến trúc đây nhé');
  });

  test('should send a message that is nothing but a file', async ({ page }) => {
    // Arrange
    await setupRoutes(page, message({ attachments: [imageAttachment] }));
    await openConversation(page);

    // Act: nothing is typed at all.
    await page.getByLabel('Chọn tệp để gửi').setInputFiles({
      name: 'so-do-kien-truc.png',
      mimeType: 'image/png',
      buffer: PNG,
    });

    // Assert
    await expect(page.getByLabel('Gửi')).toBeEnabled();
    await page.getByLabel('Gửi').click();
    await expect(page.getByAltText('so-do-kien-truc.png')).toBeVisible({ timeout: 15000 });
    expect(sentBodies).toHaveLength(1);
  });

  test('should refuse a format off the allowlist without uploading it', async ({ page }) => {
    // Arrange
    await setupRoutes(page, message({}));
    await openConversation(page);

    // Act: an SVG can run script, so it never reaches the server.
    await page.getByLabel('Chọn tệp để gửi').setInputFiles({
      name: 'ban-ve.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    });

    // Assert
    await expect(page.getByRole('alert')).toContainText('ban-ve.svg');
    await expect(page.getByLabel('Gửi')).toBeDisabled();
    expect(sentBodies).toHaveLength(0);
  });

  test('should offer a document as a download rather than rendering it', async ({ page }) => {
    // Arrange
    await setupRoutes(page, message({ attachments: [documentAttachment] }));
    await openConversation(page);

    // Act
    await page.getByLabel('Chọn tệp để gửi').setInputFiles({
      name: 'bao-cao-tien-do.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7'),
    });
    await page.getByLabel('Gửi').click();

    // Assert
    const chip = page.getByLabel('Tải bao-cao-tien-do.pdf');
    await expect(chip).toBeVisible({ timeout: 15000 });
    await expect(chip).toContainText('3.0 MB');
  });

  test('should let an attached file be dropped before it is sent', async ({ page }) => {
    // Arrange
    await setupRoutes(page, message({}));
    await openConversation(page);
    await page.getByLabel('Chọn tệp để gửi').setInputFiles({
      name: 'so-do-kien-truc.png',
      mimeType: 'image/png',
      buffer: PNG,
    });

    // Act
    await page.getByLabel('Bỏ so-do-kien-truc.png').click();

    // Assert
    await expect(page.getByLabel('Gửi')).toBeDisabled();
    expect(sentBodies).toHaveLength(0);
  });
});
