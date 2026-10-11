/**
 * Workspace navigation helper for benchmark E2E tests.
 * Finds and navigates into workspace chat interface.
 */

import { Page } from '@playwright/test';

/** Default timeout for navigation operations. */
const NAV_TIMEOUT_MS = 15_000;

/**
 * Navigate to the Chat page of a workspace by clicking its card on the workspace list.
 *
 * @param page - Authenticated Playwright page at /workspaces
 * @param workspaceName - Exact workspace name displayed on the card
 */
export async function navigateToWorkspaceChat(
  page: Page,
  workspaceName: string,
): Promise<void> {
  // Ensure we're on the workspaces list page
  if (!page.url().includes('/workspaces')) {
    await page.goto('/workspaces');
  }
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT_MS });

  // Click the workspace card matching the name
  const workspaceCard = page
    .locator('.workspace-card', { hasText: workspaceName })
    .first();
  await workspaceCard.waitFor({ state: 'visible', timeout: NAV_TIMEOUT_MS });
  await workspaceCard.click();

  // Wait for workspace context to load
  await page.waitForURL(/\/workspaces\/[^/]+/, { timeout: NAV_TIMEOUT_MS });

  // Click "Trò chuyện" nav item in sidebar
  const chatNavBtn = page
    .locator('.side-nav__item', { hasText: 'Trò chuyện' })
    .first();
  await chatNavBtn.waitFor({ state: 'visible', timeout: NAV_TIMEOUT_MS });
  await chatNavBtn.click();

  // Wait for chat input to be ready
  const chatInput = page.locator('.chat-input-form__field');
  await chatInput.waitFor({ state: 'visible', timeout: NAV_TIMEOUT_MS });
}

/**
 * Start a new chat conversation within the current workspace.
 * Clicks the "new chat" button to reset conversation context.
 *
 * @param page - Playwright page currently in a workspace chat
 */
export async function startNewChat(page: Page): Promise<void> {
  // Look specifically for the "Hội thoại mới" button inside the chat header
  const newChatBtn = page
    .locator('.chat-header button', { hasText: 'Hội thoại mới' })
    .first();

  if (await newChatBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await newChatBtn.click();
    await page.waitForTimeout(500);
    // Wait for chat input to be ready
    await page.locator('.chat-input-form__field').waitFor({
      state: 'visible',
      timeout: 10_000,
    });
  } else {
    // Fallback: navigate directly to the chat page
    const currentUrl = page.url();
    const workspaceMatch = currentUrl.match(/\/workspaces\/([^/]+)/);
    if (workspaceMatch) {
      await page.goto(`/workspaces/${workspaceMatch[1]}/chat`);
      await page.locator('.chat-input-form__field').waitFor({
        state: 'visible',
        timeout: NAV_TIMEOUT_MS,
      });
      await page.waitForTimeout(500);
    }
  }
}
