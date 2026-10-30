import { expect, test } from '@playwright/test';

test.use(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});

const PREVIEW = '/e2e/fixtures/evidence-rail-preview.html';

test('should set an answer beside its sources, not above them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(PREVIEW);

  const rail = page.locator('.evidence-rail');
  const answer = page.locator('.chat-msg--assistant .chat-msg__bubble');
  await expect(rail).toBeVisible();

  const railBox = (await rail.boundingBox())!;
  const answerBox = (await answer.boundingBox())!;

  // Beside, not below: the rail starts to the right of where the answer ends.
  expect(railBox.x).toBeGreaterThan(answerBox.x + answerBox.width);
  // And level with it, rather than pushed to the top or the bottom of the message.
  expect(Math.abs(railBox.y - answerBox.y)).toBeLessThan(80);
});

test('should number every source and name where it came from', async ({ page }) => {
  await page.goto(PREVIEW);

  const entries = page.locator('.evidence-rail__item');
  await expect(entries).toHaveCount(3);
  await expect(entries.first().locator('.evidence-rail__mark')).toHaveText('1');
  await expect(entries.first().locator('.evidence-rail__file')).toHaveText('MongoDB cơ bản.pdf');
  await expect(entries.first().locator('.evidence-rail__locator')).toHaveText('Trang 24');
  await expect(entries.nth(2).locator('.evidence-rail__mark')).toHaveText('3');
});

test('should hold the answer to a readable measure', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(PREVIEW);

  // A line of Vietnamese prose past this width loses the reader on the wrap.
  const box = (await page.locator('.chat-msg--assistant .chat-msg__bubble').boundingBox())!;
  expect(box.width).toBeLessThan(760);
});

test('should drop the rail below the answer when there is no margin left', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto(PREVIEW);

  const railBox = (await page.locator('.evidence-rail').boundingBox())!;
  const answerBox = (await page.locator('.chat-msg--assistant .chat-msg__bubble').boundingBox())!;

  expect(railBox.y).toBeGreaterThan(answerBox.y);
  // Back in the one column, sharing its left edge with the answer.
  expect(Math.abs(railBox.x - answerBox.x)).toBeLessThan(40);
});

test('should carry the one saturated colour on the citation marks', async ({ page }) => {
  await page.goto(PREVIEW);

  // The seal red is reserved for evidence; nothing else on the page may wear it.
  await expect(page.locator('.evidence-rail__mark').first())
    .toHaveCSS('background-color', 'rgb(163, 59, 31)');
});
