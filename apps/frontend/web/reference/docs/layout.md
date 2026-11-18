# Layout: spacing, radius, elevation, grid, breakpoints

## Spacing (4px base)
`space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64 · `20` 80 · `24` 96. Use only these. Inside components use 4 to 24; between blocks 32 to 96.

## Radius
`radius-xs` 2 · `sm` 4 (tags, checkbox, small buttons) · **`md` 8 (buttons, inputs, selects)** · `lg` 10 (menus, alerts, document rows) · **`xl` 14 (cards, dialogs)** · `2xl` 20 (sheets, hero) · `full` (pills, avatars, switch). Nested radius = outer minus padding.

## Elevation
**Cards, tiles, tables and DataGrid have no shadow:** they use a 2px `grey-200` border. Shadows are only for floating layers: `shadow-md` menus, popovers, hover cards; `shadow-lg` dialogs, sheets, toasts. `shadow-xs` stays on buttons and inputs (inset-button for primary). Shadows use ink (`#1A2B3C`) at low alpha, never black. On the navy ground, separate surfaces by fill, not shadow.

Z-index: sticky 100, dropdown 200, overlay 300, modal 400, toast 500, tooltip 600.

## Grid and containers
- 12 columns, 24px gutter (16px under 768px), container max **1280px**, side padding 24px (16px mobile).
- Reading width max 720px.
- Product and exporter grids: 4 columns ≥1280, 3 ≥1024, 2 ≥640, 1 below.

## Breakpoints
| Name | Min width | Use |
|---|---|---|
| sm | 640px | 2-column grids |
| md | 768px | Tablet, tab bars become sidebars |
| lg | 1024px | Desktop navigation, 3 columns |
| xl | 1280px | Container max, 4 columns |
| 2xl | 1536px | Wide margins only |

Design mobile first. Target both a 375px and a 1440px reference.

## Section rhythm
Section padding 64px mobile, 80px tablet, 96px desktop. Headline to content 32px. Card gap 24px.

## Control sizes
`control-sm` 32 (Ant Design default, dense desktop), **`control-md` 40 (default; 44 on touch)**, `control-lg` 48. Icon sizes 16, 20, 24.
