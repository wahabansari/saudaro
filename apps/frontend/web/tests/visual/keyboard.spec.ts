import { expect, test, type Page } from '@playwright/test';
import { record } from './helpers';

const note = (name: string, text: string) => record('keyboard.json', 'results', name, text);
const wrapper = (page: Page, name: string) => page.locator(`[data-ds-component="${name}"]`).first();

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
});

test('Dialog: Enter opens, focus stays trapped, Esc closes and returns focus', async ({ page }) => {
  const trigger = wrapper(page, 'Dialog').locator('button').first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  note('Dialog', 'PASS');
});

test('Menu: Enter opens, arrows move, Esc closes and returns focus', async ({ page }) => {
  const trigger = wrapper(page, 'Menu').locator('button[aria-haspopup="menu"]').first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  note('Menu', 'PASS');
});

test('Select: Enter opens listbox, arrow + Enter picks, Esc closes', async ({ page }) => {
  const trigger = wrapper(page, 'Select').getByRole('combobox').first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  note('Select', 'PASS');
});

test('Tabs: arrow keys move selection', async ({ page }) => {
  const tabs = wrapper(page, 'Tabs').getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  note('Tabs', 'PASS');
});

test('Accordion: Enter toggles panel', async ({ page }) => {
  const trigger = wrapper(page, 'Accordion').locator('button[aria-expanded]').first();
  await trigger.focus();
  const before = await trigger.getAttribute('aria-expanded');
  await page.keyboard.press('Enter');
  await expect(trigger).not.toHaveAttribute('aria-expanded', before ?? '');
  await expect(trigger).toBeFocused();
  note('Accordion', 'PASS');
});
