import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { COMPONENTS_DIR, OUT, WEB, components, writeJson } from './helpers';

const WIDTHS = [1440, 375];
const PADDING = 20;
const SETTLE: Record<string, number> = { PageLoader: 800 }; // appears after a 300 ms delay
const STYLES = ['saudaro-tokens.css', 'saudaro-bundle.css'].map((f) =>
  pathToFileURL(path.join(WEB, 'src/styles', f)).href,
);
// Same treatment on both sides: freeze motion, hide the caret.
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
const BOX = (width: number) =>
  `box-sizing:border-box;margin:0;width:${width - PADDING * 2}px;background:var(--grey-100)`;

/** Preview wrapper: the preview's own `body{}` rule is re-pointed at #root so it still applies. */
function writeWrapper(name: string, width: number) {
  const html = fs
    .readFileSync(path.join(COMPONENTS_DIR, name, 'preview.html'), 'utf8')
    .replace(/\bbody\s*\{/g, '#ds-root{')
    // The kit's ../../assets/Logo folder is not shipped; the same files live in public/brand.
    .replaceAll('../../assets/Logo/', pathToFileURL(path.join(WEB, 'public/brand/')).href);
  const file = path.join(OUT, 'wrappers', `${name}-${width}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `<!doctype html><meta charset="utf-8">${STYLES.map((h) => `<link rel="stylesheet" href="${h}">`).join('')}` +
      `<style>${FREEZE}body{margin:0}#ds-root{padding:${PADDING}px}</style>` +
      `<div id="ds-root"><div id="ds-box" style="${BOX(width)}">${html}</div></div>`,
  );
  return pathToFileURL(file).href;
}

async function settle(page: Page, wait: number) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
}

function compare(a: Buffer, b: Buffer, diffFile: string) {
  const [pa, pb] = [PNG.sync.read(a), PNG.sync.read(b)];
  const w = Math.max(pa.width, pb.width);
  const h = Math.max(pa.height, pb.height);
  const pad = (p: PNG) => {
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(p, out, 0, 0, p.width, p.height, 0, 0);
    return out;
  };
  const [ca, cb, diff] = [pad(pa), pad(pb), new PNG({ width: w, height: h })];
  const px = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold: 0.1 });
  if (px > 0) fs.writeFileSync(diffFile, PNG.sync.write(diff));
  return { px, pct: (px / (w * h)) * 100, preview: [pa.width, pa.height], gallery: [pb.width, pb.height] };
}

for (const width of WIDTHS) {
  test(`pixel check at ${width}px`, async ({ browser }) => {
    test.setTimeout(900_000);
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const gallery = await ctx.newPage();
    const preview = await ctx.newPage();
    await gallery.goto('/design-system', { waitUntil: 'networkidle' });
    await gallery.addStyleTag({ content: FREEZE });
    await settle(gallery, 800);

    const dir = path.join(OUT, 'diff', String(width));
    fs.mkdirSync(dir, { recursive: true });
    const results: Record<string, unknown> = {};
    for (const name of components) {
      const target = gallery.locator(`[data-ds-component="${name}"]`);
      const count = await target.count();
      if (count === 0) {
        results[name] = { status: 'MISSING' };
        continue;
      }
      await preview.goto(writeWrapper(name, width));
      await settle(preview, SETTLE[name] ?? 0);
      const expected = await preview.locator('#ds-box').screenshot();
      const el = target.first();
      await el.evaluate((n, css) => n.setAttribute('style', css), BOX(width));
      await settle(gallery, SETTLE[name] ?? 0);
      const actual = await el.screenshot();
      fs.writeFileSync(path.join(dir, `${name}.preview.png`), expected);
      fs.writeFileSync(path.join(dir, `${name}.gallery.png`), actual);
      const r = compare(expected, actual, path.join(dir, `${name}.diff.png`));
      results[name] = { status: r.px === 0 ? 'PASS' : 'DIFF', ...r, wrappers: count };
    }
    writeJson(`pixel-${width}.json`, results);
    await ctx.close();
    const bad = Object.entries(results).filter(([, r]) => (r as { status: string }).status !== 'PASS');
    expect.soft(bad.map(([n]) => n), 'components that differ or are missing').toEqual([]);
  });
}
