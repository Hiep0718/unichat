import { expect, test } from '@playwright/test';

import { installWorkspacePolicyScenario, POLICY_WORKSPACE_ID } from './fixtures/workspace-ai-policy';

const SCREENSHOTS = process.env.SIDE_NAV_SCREENSHOTS;

test('should rest as an icon rail and push the content aside when it opens on hover', async ({ page }) => {
  // Arrange
  await installWorkspacePolicyScenario(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/workspaces/${POLICY_WORKSPACE_ID}/settings`);
  const nav = page.getByRole('navigation', { name: 'Thanh điều hướng chính' });
  const main = page.locator('.app-shell__main');
  const themeIcon = nav.locator('.side-nav__item').filter({ hasText: /Nền/ }).locator('.side-nav__icon-wrap');
  await expect(nav).toBeVisible();
  await page.mouse.move(900, 450);

  // Assert: resting, only icons, and the content reserves just that width.
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(68);
  await expect(nav.getByText('Đổi nhóm')).toBeHidden();
  const restingIcon = await themeIcon.boundingBox();
  const restingMain = await main.boundingBox();
  expect(restingMain?.x).toBe(68);
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/rail-resting.png` });

  // Act
  await nav.hover({ position: { x: 34, y: 300 } });

  // Assert: open with labels, icons in place, and the content moved aside so
  // the rail covers none of it.
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(224);
  await expect(nav.getByText('Đổi nhóm')).toBeVisible();
  const openIcon = await themeIcon.boundingBox();
  expect(openIcon?.x).toBe(restingIcon?.x);
  await expect.poll(async () => (await main.boundingBox())?.x).toBe(224);
  await expect(nav.getByRole('button', { name: /Thu gọn|Mở rộng thanh bên/ })).toHaveCount(0);
  if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/rail-open.png` });

  // Act: leaving closes it again.
  await page.mouse.move(900, 450);

  // Assert: the content returns to the resting margin.
  await expect.poll(async () => (await nav.boundingBox())?.width).toBe(68);
  await expect.poll(async () => (await main.boundingBox())?.x).toBe(68);
});
