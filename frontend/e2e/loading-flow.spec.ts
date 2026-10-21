import { expect, test } from '@playwright/test';

test.use(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});

test('should retain one loading indicator from session verification to the lazy login page', async ({ page }) => {
  const sessionGate = Promise.withResolvers<void>();
  const pageGate = Promise.withResolvers<void>();
  await page.route('**/*', async (route) => {
    const address = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(address.hostname)) {
      await route.abort();
      return;
    }
    if (address.pathname.endsWith('/auth/refresh')) {
      await sessionGate.promise;
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Phiên đã hết hạn"}' });
      return;
    }
    if (address.pathname.startsWith('/api/')) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }
    if (address.pathname.endsWith('/features/auth/login-page.tsx')) await pageGate.promise;
    await route.continue();
  });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const indicator = page.getByRole('status');
  await expect(indicator).toContainText('Đang xác minh phiên đăng nhập…');
  await indicator.evaluate((element) => { element.setAttribute('data-loading-instance', 'original'); });

  sessionGate.resolve();
  await expect(indicator).toContainText('Đang kết nối giao diện...');

  await expect(indicator).toHaveAttribute('data-loading-instance', 'original');
  await expect(indicator).toHaveCount(1);

  pageGate.resolve();

  await expect(indicator).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
});
