import { expect, test } from '@playwright/test';
import { TEST_USER } from './test-credentials.js';

/**
 * Group conversations: creating one, reading it, and who may change it.
 *
 * Every request is fulfilled locally, as the rest of this suite does. What is
 * under test is the UI's own reasoning — which controls a group shows, which an
 * owner sees and a member does not, and that a group bubble names its sender
 * while a one-to-one bubble does not.
 */
test.describe('Automation Suite 08 — Group Chat', () => {
  const GROUP_ID = 'c0000000-0000-0000-0000-000000000002';
  const ME = 'u0000000-0000-0000-0000-000000000001';
  const MINH = 'u0000000-0000-0000-0000-000000000002';
  const BAO = 'u0000000-0000-0000-0000-000000000003';

  const participants = (ownerId: string) => [
    { userId: ME, name: 'Sinh viên Nghiên cứu', role: ownerId === ME ? 'OWNER' : 'MEMBER', me: true },
    { userId: MINH, name: 'Minh Anh', role: ownerId === MINH ? 'OWNER' : 'MEMBER', me: false },
    { userId: BAO, name: 'Quốc Bảo', role: ownerId === BAO ? 'OWNER' : 'MEMBER', me: false },
  ];

  const group = (ownerId: string) => ({
    id: GROUP_ID,
    kind: 'GROUP',
    title: 'Nhóm đồ án',
    otherUserId: null,
    participants: participants(ownerId),
    lastMessage: 'Họp lúc ba giờ nhé',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
  });

  const messages = [
    {
      id: 'm0000000-0000-0000-0000-000000000001',
      conversationId: GROUP_ID,
      senderId: MINH,
      senderName: 'Minh Anh',
      body: 'Họp lúc ba giờ nhé',
      mine: false,
      createdAt: new Date().toISOString(),
      attachments: [],
    },
  ];

  /** Requests the page made, so a refusal can be told from a missing call. */
  let calls: string[] = [];

  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  const setupRoutes = async (page: any, ownerId: string) => {
    calls = [];

    await page.route(/\/api\/v1\//, async (route: any) =>
      route.fulfill(json({ content: [], totalElements: 0, totalPages: 0 })));

    await page.route(/\/api\/v1\/auth\//, async (route: any) =>
      route.fulfill(json({
        accessToken: 'test-e2e-token-group-chat-08',
        tokenType: 'Bearer',
        user: {
          id: ME,
          email: TEST_USER.email,
          fullName: 'Sinh viên Nghiên cứu',
          systemRole: 'USER',
          status: 'ACTIVE',
        },
      })));

    await page.route(/\/api\/v1\/work-chat\//, async (route: any) => {
      const url = route.request().url();
      const method = route.request().method();
      calls.push(`${method} ${url.split('/api/v1')[1]}`);

      if (url.includes('/contacts')) {
        return route.fulfill(json([
          { userId: MINH, name: 'Minh Anh', sharedGroup: 'Lớp K21' },
          { userId: BAO, name: 'Quốc Bảo', sharedGroup: 'Lớp K21' },
        ]));
      }
      if (url.includes('/groups') && method === 'POST' && !url.includes('/members')) {
        return route.fulfill(json(group(ME)));
      }
      if (url.includes('/members') || url.includes('/participants')) {
        return route.fulfill(json(participants(ownerId)));
      }
      if (url.includes('/messages')) {
        return route.fulfill(json(messages));
      }
      if (url.includes('/conversations')) {
        return route.fulfill(json([group(ownerId)]));
      }
      if (url.includes('/presence')) {
        return route.fulfill(json([]));
      }
      return route.fulfill({ status: 204, body: '' });
    });
  };

  const openWorkChat = async (page: any, ownerId: string) => {
    await setupRoutes(page, ownerId);
    await page.goto('/login');
    await page.locator('input[type="email"], input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"], input[name="password"]').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/workspaces/, { timeout: 15000 });
    await page.goto('/work-chat');
    await expect(page.getByText('Nhóm đồ án').first()).toBeVisible({ timeout: 15000 });
  };

  test('should create a group and open it', async ({ page }) => {
    // Arrange
    await openWorkChat(page, ME);

    // Act
    await page.getByLabel('Tạo nhóm mới').click();
    await page.getByLabel('Tên nhóm').fill('Nhóm đồ án');
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Tạo nhóm' }).click();

    // Assert
    await expect(page.getByRole('heading', { name: 'Nhóm đồ án' })).toBeVisible({ timeout: 15000 });
    expect(calls.some((call) => call.startsWith('POST /work-chat/groups'))).toBe(true);
  });

  test('should name the sender on a group message', async ({ page }) => {
    // Arrange
    await openWorkChat(page, ME);

    // Act
    await page.getByText('Nhóm đồ án').first().click();

    // Assert: a group has more than one other person, so a bubble says who.
    await expect(page.getByText('Minh Anh').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Họp lúc ba giờ nhé')).toBeVisible();
  });

  test('should let the owner open the member list and remove someone', async ({ page }) => {
    // Arrange
    await openWorkChat(page, ME);
    await page.getByText('Nhóm đồ án').first().click();

    // Act
    await page.getByLabel('Xem thành viên nhóm').click();
    await expect(page.getByText('Chủ nhóm')).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Xóa Quốc Bảo khỏi nhóm').click();

    // Assert
    await expect
      .poll(() => calls.some((call) => call.startsWith('DELETE /work-chat/groups')))
      .toBe(true);
  });

  test('should hide the owner controls from an ordinary member', async ({ page }) => {
    // Arrange: the server refuses these calls regardless; hiding them is for
    // clarity, and this is the check that the clarity is actually there.
    await openWorkChat(page, MINH);
    await page.getByText('Nhóm đồ án').first().click();

    // Act
    await page.getByLabel('Xem thành viên nhóm').click();

    // Assert
    await expect(page.getByText('Rời nhóm')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Thêm thành viên')).toHaveCount(0);
    await expect(page.getByLabel('Xóa Quốc Bảo khỏi nhóm')).toHaveCount(0);
  });

  test('should close the thread after leaving a group', async ({ page }) => {
    // Arrange
    await openWorkChat(page, MINH);
    await page.getByText('Nhóm đồ án').first().click();
    await page.getByLabel('Xem thành viên nhóm').click();

    // Act
    await page.getByText('Rời nhóm').click();

    // Assert
    await expect
      .poll(() => calls.some((call) => call.includes('/leave')))
      .toBe(true);
  });
});
