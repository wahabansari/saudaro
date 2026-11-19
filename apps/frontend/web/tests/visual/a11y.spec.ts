import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { record } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Elements whose right edge sticks out of the page, with the gallery wrapper they sit in. */
const overflowers = (page: Page) =>
  page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    return [...document.body.querySelectorAll('*')]
      .filter((e) => e.getBoundingClientRect().right > limit + 1)
      .slice(0, 5)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} in ${e.closest('[data-ds-component]')?.getAttribute('data-ds-component') ?? 'page'}`);
  });

for (const width of [1440, 375]) {
  test(`axe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/design-system', { waitUntil: 'networkidle' });
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const rows = [];
    for (const v of violations) {
      for (const node of v.nodes) {
        const selector = String(node.target[0]);
        const wrapper = await page
          .evaluate((s) => document.querySelector(s)?.closest('[data-ds-component]')?.getAttribute('data-ds-component') ?? null, selector)
          .catch(() => null);
        rows.push({ impact: v.impact, rule: v.id, selector, wrapper });
      }
    }
    record('a11y.json', 'axe', String(width), rows);
    const blocking = rows.filter((r) => r.impact === 'serious' || r.impact === 'critical');
    expect.soft(blocking, 'serious or critical axe violations').toEqual([]);
  });
}

for (const [label, viewport, scale] of [['320px', 320, 1], ['200% zoom', 720, 2]] as const) {
  test(`no horizontal page scroll at ${label}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: viewport, height: 800 }, deviceScaleFactor: scale });
    const page = await ctx.newPage();
    await page.goto('/design-system', { waitUntil: 'networkidle' });
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const ok = scrollWidth <= clientWidth;
    record('a11y.json', 'reflow', label, { ok, scrollWidth, clientWidth, offenders: ok ? [] : await overflowers(page) });
    await ctx.close();
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test('data-theme="navy" re-themes a gallery section', async ({ page }) => {
  await page.goto('/design-system', { waitUntil: 'networkidle' });
  const read = () =>
    page.evaluate(() => {
      const el = document.getElementById('forms')!;
      return getComputedStyle(el).getPropertyValue('--ground').trim();
    });
  const before = await read();
  await page.evaluate(() => document.getElementById('forms')!.setAttribute('data-theme', 'navy'));
  const after = await read();
  record('a11y.json', 'navy', 'forms', { before, after, ok: before !== after });
  expect(after).not.toBe(before);
});
