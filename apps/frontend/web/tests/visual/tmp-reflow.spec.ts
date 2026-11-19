import { test } from '@playwright/test';

test('measure Stepper and PageHeader at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const out = await page.evaluate(() => {
    const lines: string[] = [];
    const walk = (el: Element, depth: number) => {
      if (depth > 5) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      lines.push(
        `${'  '.repeat(depth)}<${el.tagName.toLowerCase()} .${String(el.className).slice(0, 38)}> w=${Math.round(r.width)} right=${Math.round(r.right)} disp=${cs.display} wrap=${cs.flexWrap} minw=${cs.minWidth} ws=${cs.whiteSpace}`,
      );
      for (const c of Array.from(el.children).slice(0, 6)) walk(c, depth + 1);
    };
    for (const name of ['Stepper', 'PageHeader']) {
      lines.push(`=== ${name}`);
      const root = document.querySelector(`[data-ds-component="${name}"]`);
      if (root) walk(root, 0);
    }
    return lines.join('\n');
  });
  console.log('\n' + out);
});
