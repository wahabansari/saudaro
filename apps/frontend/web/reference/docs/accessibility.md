# Accessibility

Target: **WCAG 2.2 Level AA**, with AAA contrast for body text wherever the palette allows.

## Contrast
- Normal text 4.5:1 (body text is ink on white, 14.4:1), large text 3:1, UI components, icons and focus rings 3:1.
- The full computed table is in Colour. Every shipped text pair passes AA; body text on navy is 8.1:1, on cards 14.4:1.
- Never rely on colour: status badges, errors and charts add icon, text or pattern. Colours that must be told apart differ in lightness, not hue alone.
- Placeholders are `grey-500` on white (5.2:1) and are examples, never labels.

## Focus
- Every interactive element shows a 2px ring with 2px offset on `:focus-visible`. Ring is `focus-on-card` (primary-700, 5.1:1 on white) on cards, plus a 5px `focus-halo` on text inputs, `focus-on-ground` (primary-300, 5.0:1 on navy) on ground.
- Never `outline: none` without replacement. Focus is not hidden by sticky headers (`scroll-padding-top` = header height + 16px).
- Logical order, no keyboard traps. Dialogs and sheets trap focus and return it on close.

## Targets
- Controls are **40px on desktop pointers and 44px on touch** (`pointer: coarse` raises them automatically, including chips and pagination). `control-sm` 32px is for dense desktop tables and toolbars only, with at least 8px spacing (WCAG 2.5.8 minimum is 24px).

## Keyboard
All functions work with keyboard: Tab, Shift+Tab, Enter, Space, Esc, arrow keys inside tabs, menus, radio groups, select. Radix primitives supply this; do not override it. Include a "Skip to content" link first.

## Semantics
- Landmarks: `header`, `nav` with `aria-label`, `main`, `footer`. One `h1` per page, headings in order.
- Form fields: visible `label` with `for`; errors linked by `aria-describedby`; `aria-invalid`, `aria-required`. Error summary at the top of a form moves focus to itself.
- Status updates (toasts, upload progress, new message) use `role="status"` or `aria-live="polite"`; errors `role="alert"`.
- Tables: `th scope`, `caption` or `aria-label`, `aria-sort` on sortable headers.
- Images: meaningful `alt`; decorative `alt=""`. Documents: link text includes type and size ("Download ISO 22000 certificate, PDF, 1.2 MB").
- Language: `lang` on `html`; mark foreign names with `lang`.

## Motion and zoom
- Honour `prefers-reduced-motion` (see Motion). No flashing over 3 times per second.
- Layout works at 320px width and 200% zoom without horizontal scroll. Text can be resized to 200%.
- Tooltips and popovers are dismissible (Esc), hoverable and persistent (WCAG 1.4.13).

## Testing checklist (every page)
1. Keyboard only from top to bottom.
2. Screen reader pass (VoiceOver, NVDA) for headings, forms, dialogs.
3. 200% zoom and 320px width.
4. Grayscale screenshot: statuses still readable.
5. axe or Lighthouse reports no serious issues.
