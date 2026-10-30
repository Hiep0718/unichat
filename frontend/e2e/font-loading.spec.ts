import { expect, test } from '@playwright/test';

test.use(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});

/**
 * Guards a failure that is silent and specific to this app's language.
 *
 * The @font-face rules used to be imported from main.tsx, so anything that
 * rendered the design system from another entry point — a preview fixture,
 * a test harness — got no fonts and fell through to the stack's next family.
 * On Windows that is Georgia, which has no precomposed Vietnamese glyphs and
 * decomposes "bắt" into "bă´t". Nothing errors; the text simply becomes wrong
 * in a way only a Vietnamese reader notices.
 *
 * Importing the fonts from the stylesheet that declares the tokens fixes it,
 * and this test keeps it fixed.
 */
const FACES = [
  '16px "IBM Plex Sans Variable"',
  '16px "Source Serif 4 Variable"',
];

for (const face of FACES) {
  test(`should load ${face} wherever the design system is rendered`, async ({ page }) => {
    await page.goto('/e2e/fixtures/evidence-rail-preview.html');
    await page.evaluate(() => document.fonts.ready);

    // Checked with Vietnamese text, not with "abc": a face can carry Latin and
    // still be missing the stacked diacritics this interface is written in.
    const loaded = await page.evaluate(
      (spec) => document.fonts.check(spec, 'bắt nắm gặt đồng vướng tuyệt'),
      face,
    );
    expect(loaded).toBe(true);
  });
}

test('should render the answer and its sources in the same reading face', async ({ page }) => {
  await page.goto('/e2e/fixtures/evidence-rail-preview.html');
  await page.evaluate(() => document.fonts.ready);

  // One face across the claim and the source it rests on: checking one against
  // the other should not ask the eye to change typeface.
  const answer = await page.locator('.chat-msg__markdown').evaluate(
    (el) => getComputedStyle(el).fontFamily,
  );
  const excerpt = await page.locator('.evidence-rail__excerpt').first().evaluate(
    (el) => getComputedStyle(el).fontFamily,
  );

  expect(answer).toContain('Source Serif 4 Variable');
  expect(excerpt).toContain('Source Serif 4 Variable');
});
