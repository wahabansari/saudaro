# Typography

## Family
**Inter** is the only typeface, for the whole site: headings, body, labels, buttons, and data. It is shipped as the complete variable font (upright and italic) with two axes:
- **wght 100 to 900** (Thin to Black).
- **opsz 14 to 32** (optical size). Text sizes get sturdier letterforms, display sizes get tighter, finer ones. Always on: `font-optical-sizing: auto`.

Files are in `fonts/` (`InterVariable.woff2`, `InterVariable-Italic.woff2`), SIL Open Font License 1.1. Load with `font-display: swap` and preload `InterVariable.woff2`.

## OpenType features
| Where | Setting | Why |
|---|---|---|
| Everywhere (set on `body`) | `"calt", "cv05"` | Contextual alternates and the lowercase l with a tail, so `l`, `I` and `1` never look alike in references. |
| Data: references, prices, HS codes, Incoterms, table numbers | `"lnum", "cv05", "calt"`, weight +100, `letter-spacing: -0.02em` | Lining figures with Inter's default proportional widths. **Do not use `tnum`**: it adds a foot serif to `1`. Numbers are right-aligned in tables so columns still line up. The `.sa-num` / `.sa-mono` class and every data component add these. |
| Large figures and statistics | add `"case"` when mixing caps and figures | Keeps punctuation centred on cap height. |

There is no separate monospace font. Data is Inter with lining figures, one weight heavier and tracked 0.02em tighter.

| Weight | Value | Use |
|---|---|---|
| Regular | 400 | Body text |
| Medium | 500 | Labels, buttons, tabs, table headings |
| SemiBold | 600 | Headings, display, badges |
| Bold | 700 | Emphasis inside body, large numerals |
| Thin to Light | 100 to 300 | Not used in UI. Allowed for large display numerals on navy only. |
| ExtraBold, Black | 800, 900 | Not used. |

## Scale
Defined in `tokens.json`. Base 16px. Display tracking is tightened (-0.035em at 72px to -0.02em at 36px); body and data are 0; overline +0.08em.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| display-2xl | 72 / 76 | 600 | Home hero |
| display-xl | 56 / 60 | 600 | Section hero |
| display-lg | 44 / 48 | 600 | Landing page title |
| h1 | 36 / 42 | 600 | Page title |
| h2 | 30 / 36 | 600 | Section title |
| h3 | 24 / 32 | 600 | Group title |
| h4 | 20 / 28 | 600 | Card title |
| h5 | 18 / 26 | 600 | Small title |
| body-lg | 18 / 28 | 400 | Lead |
| body | 16 / 24 | 400 | Default |
| body-sm | 14 / 20 | 400 | Table, secondary |
| label | 14 / 20 | 500 | Form labels, buttons |
| caption | 12 / 16 | 400 | Helper text. **Smallest size.** |
| overline | 12 / 16 | 600 | Eyebrow, uppercase |
| mono-lg / mono / mono-sm | 16 / 14 / 12 | 500 / 400 / 400 | Data |

Responsive: below 768px display-2xl drops to 44, display-xl to 36, display-lg to 32, h1 to 30.

## Rules
- Line length 45 to 75 characters (`content-max` 720px).
- Left-aligned text. No justified text, no all-caps beyond overline and badges in tables.
- Numbers in tables use lining numerals (`font-variant-numeric: lining-nums`), one weight heavier, `letter-spacing: -0.02em`, right-aligned. Never `tabular-nums` (it adds a foot to `1`).
- Use the data style for values only, never for sentences.
- Respect user text scaling: sizes in `rem` in implementation; layout must survive 200% zoom.
- Fallback stack: `ui-sans-serif, system-ui, sans-serif` (the same stack for data).
