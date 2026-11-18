# SAUDARO: master build prompt (design system to Next.js + Tailwind)

Paste everything below the line into your coding agent (Claude Code, Cursor, etc.) with this kit folder (`saudaro-kit/`) available in the repo root. Do not shorten it.

---

## ROLE

You are a senior front-end engineer. Your job is to implement the **SAUDARO design system** in a Next.js app **pixel for pixel**. SAUDARO is a public B2B import/export marketplace (importers post RFQs and quotations, exporters show products with sample documents, negotiation happens in one place).

The design is **finished and approved**. You are not designing. You are porting. If something looks unfinished or you would do it differently, do it exactly as the kit says anyway and list it under "Questions" at the end. **Do not change one line of CSS, one colour, one radius, one spacing value, one icon or one word of copy from the kit.**

## THE KIT (source of truth, read before writing any code)

```
saudaro-kit/
  MASTER_PROMPT.md              this file
  tailwind.config.ts            Tailwind v3.4 theme, all values point at CSS variables
  src/styles/
    globals.css                 import order: tokens, bundle, Tailwind, tiny zero-specificity reset
    saudaro-tokens.css          every design token as a CSS variable (light + navy themes)
    saudaro-bundle.css          ALL component styles (sa-* classes), the visual truth. ~66 KB
    tokens.json                 same tokens as data
    fonts/InterVariable.woff2, InterVariable-Italic.woff2
  icons/
    svg/*.svg                   77 Phosphor Duotone icons as files
    index.tsx                   React components + <Icon name="search" /> + IconName type
    README.md                   icon table (DS key, file, component)
  reference/
    COMPONENTS_SPEC.md          anatomy, states, rules and a11y for all 62 components
    components/<Name>/preview.html   the exact HTML markup of every component and state
    components/<Name>/README.md
    docs/*.md                   color, typography, layout, motion, accessibility, content-voice, logo, iconography, handoff
    logo/*.svg                  14 logo files (mark, wordmark, lockups, app icon, favicon)
```

**Rule 1: `saudaro-bundle.css` is the component stylesheet. Use it verbatim.** Every component is an element with `sa-*` classes. Components are React wrappers that render the exact markup from `reference/components/<Name>/preview.html`. You never re-write these styles in Tailwind utilities and you never "translate" them. Tailwind is used for **page layout** (grids, flex, spacing between components, responsive rules) and for anything the design system has no component for, always through the theme tokens in `tailwind.config.ts`.

**Rule 2:** the bundle must load before Tailwind utilities so utilities can override. `globals.css` already does that. Keep preflight **disabled** (`corePlugins.preflight: false`); the bundle has its own reset.

**Rule 3:** never hard-code a hex value, px radius, shadow or font. Use a token (`bg-card`, `text-ink`, `rounded-xl`, `h-control-md`). If a token is missing, stop and ask.

## 1. PROJECT SETUP

1. Create (or use) a Next.js 15 App Router project with TypeScript, `src/` directory, import alias `@/*`.
2. Install: `tailwindcss@3.4 postcss autoprefixer`, `@radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-switch @radix-ui/react-slider @radix-ui/react-accordion @radix-ui/react-toast`, `cmdk`, `@tanstack/react-table`, `@tanstack/react-query`, `react-hook-form zod @hookform/resolvers`, `next-view-transitions`, `clsx`. Do **not** install any other UI kit, icon library, animation library or font package.
3. Copy the kit: `tailwind.config.ts` to the root (replace the generated one); `src/styles/*` to `src/styles/`; `icons/` to `src/icons/`; keep `reference/` outside `src` (it is documentation, not shipped).
4. `src/app/layout.tsx`: `import "@/styles/globals.css"`, `<html lang="en" data-theme="light">`, `<body>` with no extra classes (the bundle styles `body`: Inter 14/22, `background: var(--ground)`, `color: var(--ground-text)`). No `next/font`: Inter is loaded by `@font-face` in the bundle from `src/styles/fonts/`. Preload `InterVariable.woff2`.
5. `postcss.config.js` with `tailwindcss` and `autoprefixer`.
6. Favicons and logo: copy `reference/logo/saudaro-favicon.svg`, `saudaro-app-icon.svg` and the lockups to `public/brand/`. Use the horizontal lockup in the navbar and sidebar at **height 30px**, `width:auto`, `display:block`.

## 2. DESIGN RULES YOU MUST NOT BREAK

Read `reference/docs/*.md` fully. The non-negotiables:

**Colour (60 / 30 / 10).** About 60% white and near-white surfaces, 30% grey (header, footer, showcase and sunken areas), 10% blue accent. Black is always **ink `#1A2B3C`**, never `#000`. Action blue is `--action` (`primary-700`, `#2F6AD0`). Navy is only used for hero bands, via `data-theme="navy"` on that section. Page background `grey-50`/`--ground`; header and footer `grey-100` (`--chrome`); cards `white`; sunken areas `grey-100`.

**Typography.** One typeface: Inter variable. Default 14/22. Type styles are `text-display-2xl … text-body-sm` in the Tailwind config (generated from `tokens.json`). **Numerals:** `font-feature-settings: "lnum","cv05","calt"` (lining figures so "1" has no foot), weight one step heavier than the surrounding text, `letter-spacing: -0.02em`. Use the utility classes `.sa-num` / `.sa-mono` / `.num` from the bundle for prices, quantities, references, dates in tables. **Never `font-variant-numeric: tabular-nums`** (it adds a foot to "1"). Right-align numbers in tables.

**Cards and surfaces.** Cards, tiles, document rows, panels and the DataGrid have **no shadow**. They have a **2px `grey-200` border** and `border-radius` 14 (`rounded-xl`; inner body 11). Shadows exist only on floating layers: Menu, Popover, Dialog, Sheet, Toast (`shadow-md` / `shadow-lg`).

**Showcase frame pattern** (used by DataGrid and any content card with a header): white outer, 3px padding, 2px `grey-200` border, radius 14; header on top (title + one line of text); below it a `grey-100` body with a 2px white border and radius 11 that holds the content.

**Radius:** controls 8, menus/alerts/document rows 10, cards and dialogs 14, sheets and hero 20, pills and avatars full. **Control heights:** 32 (`sm`, tables and toolbars), 40 (default, becomes 44 on touch), 48 (`lg`).

**Icons.** Phosphor **Duotone** only, from `src/icons` (`<Icon name="search" size={20} />`). Sizes 16 / 20 / 24 (32 and 48 in empty states). Always `aria-hidden` except when it is the only content of a control, then the control has an `aria-label`. **Never use emoji, another icon set, or unicode arrows as icons.**

**Status is never colour alone.** Every status is Badge = icon + text (e.g. check-circle + "Accepted", warning + "Expired").

**Checkboxes and radios.**
- In **forms**, selecting a Checkbox/Radio fills a primary **pill** from the box across the whole label (the pill grows with a clip-path animation, the label turns white, the box turns white with a primary tick). This is already in the bundle (`sa-check`, `sa-radio`); do not re-implement.
- In **tables, the bulk bar, filter lists and option lists** ("bare" checkboxes), only the 16px box fills with primary. The row, the text and the background **do not change** when selected.
- In every dropdown (Select, MultiSelect, Combobox, Menu, filters), a selected option **never gets a dark or coloured background and its text does not change**. Selection is shown only by the checkbox or a trailing check icon. There is no text-selection styling.

**Tables: there is no simple table in this system.** Every list of records, even 3 rows, is a **DataGrid** (see section 5). Do not use a bare `<table>` anywhere in the product UI.

**Motion.** Easing `cubic-bezier(.22,1,.36,1)` (`ease-pop`). Overlays open in 280ms and close in 170ms from `translateY(-8px) scale(.96)` to rest; menu items, options and filter fields fade in with a 24ms stagger (`sa-item-in`); Sheet slides 260ms; Toast rises 12px; scrim fades. Route changes use View Transitions through `next-view-transitions` with the names `sa-hero` and `sa-head`; the branded PageLoader appears after 300ms and stays at least 400ms. Honour `prefers-reduced-motion` (the bundle already does; do not override). Animate only `transform` and `opacity` (plus clip-path in the checkbox pill).

**Accessibility (WCAG 2.2 AA is the minimum).** Visible focus ring on every interactive element (the bundle defines it: 2px `--ring`, offset 2px, never remove it). Touch targets 44px. Keyboard operable top to bottom. Labels are real `<label>`s. Errors are text plus icon with `aria-describedby`. Landmarks: `header`, `nav`, `main`, `footer`; one `h1` per page; skip link first. Contrast pairs are listed in `reference/docs/color.md` and `accessibility.md`; never use a colour pair that is not in them.

**Copy.** Follow `reference/docs/content-voice.md`: plain English, sentence case, statuses written as words from the enum (never `snake_case`), dates `14 Mar 2026`, money `USD 1,240.00 / MT`, references like `RFQ-2026-00418`.

## 3. TAILWIND THEME

`tailwind.config.ts` is generated from the design tokens. It exposes:
- **Colours:** `primary-50…950`, `grey-25…800`, `success|warning|danger-100…`, `ink`, `white`, and every semantic token (`action`, `action-hover`, `action-soft`, `card`, `card-sunken`, `card-border`, `chrome`, `ground`, `ground-text`, `selected`, `link`, `success-bg/text/border`, `warning-*`, `danger-*`, `info-*`, `overlay` …). All are `var(--token)`, so `data-theme="navy"` works automatically.
- **Type:** `text-display-2xl|xl|lg`, `text-h1…h5`, `text-body-lg|body|body-sm`, caption and label styles (size, line-height, weight, tracking included).
- **Radius** `rounded-xs|sm|md|lg|xl|2xl|full`, **shadow** `shadow-xs|sm|md|lg|inset-button`, **z-index** `z-sticky|dropdown|overlay|modal|toast|tooltip`, **spacing** only the 4px scale (`1,2,3,4,5,6,8,10,12,16,20,24`) plus `control-sm|md|lg`, **max-width** `max-w-container` (1280) and `max-w-content` (720), breakpoints `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`, `ease-pop`, durations `in` 280 and `out` 170, `border-2`.

Layout recipes (use these, do not invent others):
- Container: `mx-auto w-full max-w-container px-4 md:px-6`.
- Section padding: `py-16 md:py-20 lg:py-24` (64 / 80 / 96). Headline to content `mb-8`. Card gap `gap-6`.
- Product/exporter grids: `grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- 12-column grid with 24px gutter (16px under 768px).

## 4. COMPONENT LIBRARY (62 components)

Create `src/components/ui/<Name>.tsx` for each component below. Procedure **for every component**, no exceptions:

1. Open `reference/components/<Name>/README.md` (anatomy, variants, states, rules, "Build with").
2. Open `reference/components/<Name>/preview.html`. This is the exact DOM and class names for every variant and state. Your component must render **identical markup** (same elements, same `sa-*` classes, same nesting, same ARIA attributes). Replace the inline `<svg>` with `<Icon name="…" />` (the path in the preview tells you which icon; the icons README maps DS keys to files).
3. Props map to modifier classes (`variant="secondary"` to `sa-btn--secondary`, `size="sm"` to `sa-btn--sm`). Modifiers use `--`, parts use `__`, state uses ARIA attributes (`aria-pressed`, `aria-selected`, `aria-invalid`, `aria-busy`, `aria-disabled`), not extra classes.
4. Where the README says "Build with Radix X", wrap that primitive and put the `sa-*` classes on its parts. With Radix, `data-state="open|closed"` drives the `sa-pop-in` / `sa-pop-out` animations defined in the bundle; the `.sa-pop` wrapper (`:focus-within` / `[data-open]`) exists only for static documentation previews, so do not ship it.
5. Forward refs, accept `className`, spread remaining props onto the root element, export the prop types.
6. Add the component and **every state** to the gallery route (section 7).

Inventory:
- **Actions (3):** Button, ButtonGroup, IconButton
- **Data display (8):** Avatar, Card, Chip, Divider, Rating, Statistic, Tag, Timeline
- **Data grid (4):** DataGrid, FilterDropdown, GridMenus, GridStates
- **Feedback (3):** Alert, Badge, Toast
- **Forms (9):** Checkbox, FileUpload, Input, NumberInput, Radio, Select, Slider, Switch, Textarea
- **Layout (3):** Banner, PageHeader, Sidebar
- **Loaders (3):** Progress, Skeleton, Spinner
- **Marketplace (7):** DocumentTile, ExporterCard, NegotiationThread, ProductCard, QuotationCard, RfqCard, VerificationBadge
- **Menus & dropdowns (6):** Combobox, CommandPalette, DatePicker, Menu, MultiSelect, UserMenu
- **Navigation (7):** Accordion, Breadcrumb, Footer, Navbar, Pagination, Stepper, Tabs
- **Overlays (4):** Dialog, Popover, Sheet, Tooltip
- **Page loader (3):** PageLoader, PageTransition, RouteProgress

Component-specific notes (the README has the full text; these are the traps):
- **Sidebar:** expanded 248px and rail 72px variants. Top block (logo) is 72px high with **20px** horizontal padding and `flex:none`; the nav is `flex:1; min-height:0; overflow:auto` with padding 16/12; the bottom profile block is `flex:none` with **16px / 20px** padding. The rail centres the logo mark and avatar. Do not let the header or profile shrink.
- **DocumentTile:** grid `auto / 1fr / auto / auto`, 40px icon tile, name truncates with ellipsis (full name in a Tooltip), sub line `Type · size · date`, badge, then Preview / Download icon buttons. Locked variant (`sa-doc--locked`) shows a lock, "Restricted" badge and a "Verify to view" button. Download is a real link with `download` and the file size in its label. Group tiles by document type.
- **Button:** `primary` (action fill + `shadow-inset-button`), `secondary`, `outline`, `dashed`, `text`, `link`, `danger`, `danger-soft`; sizes 32 / 40 / 48; icon gap 8px; loading shows Spinner and sets `aria-busy`.
- **Input / Select / Textarea / NumberInput / DatePicker:** border uses `--control-border` (#7B8A9A, passes 3:1), radius 8, 40px. Error state = red border + icon + message text. Inputs on mobile are 16px.
- **Toast:** rises 12px, `shadow-lg`, bottom-right (top on mobile), stays 6 seconds (longer for errors with an action), `role="status"` (errors `role="alert"`).
- **PageLoader:** the branded animated mark; shown by route transitions per the PageLoader and PageTransition READMEs.
- **Navbar / Footer:** grey (`--chrome`) background, never white. Footer is grey-100.
- **NegotiationThread, QuotationCard, RfqCard, ExporterCard, ProductCard, VerificationBadge:** marketplace components are the core of the product; match the previews exactly, including mono numerals for money, quantity, reference and deadline.

## 5. DATAGRID (the only table)

Build `DataGrid` on **TanStack Table v8** with the markup and classes from `reference/components/DataGrid/preview.html` (`sa-grid`, `sa-grid__body`, `sa-grid__scroll`, `sa-gt`, `sa-th`, `sa-bulk`, `sa-fil`, …) and the sibling components FilterDropdown, GridMenus, GridStates. Behaviour:

- Frame: `sa-grid` is the showcase frame (3px padding, 2px `grey-200` border, radius 14); inside, the scroll area is white with a 1px `grey-200` border and radius 8. **Corners must be clipped**: no border or background may poke outside the rounded corners.
- **No sort arrows and no sorting UI.** Each column header has **one filter button on the right**. Filter popover types: text, enum (with search and checkbox list), number range, date range. Active filters appear as chips under the toolbar; "Clear all filters" resets.
- **Cells never wrap**: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`, and the full value in `title`. Wide grids scroll horizontally inside the grid; the header row, the checkbox + reference column and the actions column are **sticky**.
- Selection uses the **bare** checkbox (only the 16px box fills). When rows are selected, the bulk bar (`sa-bulk`) replaces the toolbar and shows the count and actions.
- Small controls inside the grid: 32px search, filters, rows-per-page select, and 16px checkboxes.
- Toolbar, bulk bar and footer exactly as in `DataGrid/preview.html`. The three extra menus (column menu from the header: filter, pin, hide; column picker with a locked reference column; row actions) are specified in `GridMenus/README.md`. Footer: rows-per-page select, range text, Pagination.
- **Loading:** 7 skeleton rows shaped like real rows (pill / square / dot variants), shimmer gradient `grey-200 → grey-100 → grey-50`, `aria-busy="true"`.
- **Empty:** a centred `EmptyState` (icon, title, one line, "Clear all filters" button) vertically and horizontally centred in the scroll area below a still-visible header row.
- Numbers: right-aligned, `.num`, lining numerals. IDs: `.sa-mono`. Status column: Badge with icon + text. Row actions: IconButton `more` opening a Menu.
- Mobile: below 768px the grid still scrolls horizontally (do not convert to cards).
- Columns are typed config: `columns: ColumnDef[]` with `meta.filter = "text" | "enum" | "number" | "date"`, `meta.align`, `meta.sticky`. Server-side mode via TanStack Query with the filters in the URL search params.

Use DataGrid for: RFQs, Quotations, Products, Documents, Deals, Team members, Audit log, and any list in the workspace.

## 6. APP SHELLS AND ROUTES (build after the components)

- **Public layout:** skip link, `Navbar` (grey), `main`, `Footer` (grey).
- **Workspace layout:** `Sidebar` (expanded at lg+, rail below, Sheet on mobile), `PageHeader` (breadcrumb, h1, actions), content on `grey-50`.
- **Root providers:** TanStack Query, Radix Tooltip provider, Toast viewport, RouteProgress, `ViewTransitions` from `next-view-transitions`.
- Routes (empty states and loading skeletons for each): `/`, `/catalog`, `/exporters/[slug]`, `/rfqs`, `/rfqs/new`, `/rfqs/[id]`, `/quotations`, `/quotations/[id]` (negotiation), `/products`, `/documents`, `/account`, `/verification`, `/settings`, `not-found`, `error`.
  Only scaffold the shells and the DataGrid pages with mock data in this step; business pages come after the design is verified.

## 7. VERIFICATION (this is mandatory, the task is not done without it)

1. **Gallery route `/design-system`** (dev only): one section per group; every component with every state and variant exactly as in the matching `preview.html`. Also render the logo files, the colour scales, the type scale and the icon grid (all 77 icons at 24px with their DS key as caption).
2. **Pixel check:** with Playwright, for each component screenshot `reference/components/<Name>/preview.html` (loaded with `saudaro-tokens.css` + `saudaro-bundle.css` on a `grey-100` page with 20px padding) and your gallery section at the same viewport (1440 and 375 wide). Diff them (`pixelmatch`, threshold 0.1). **Any component with a visual difference must be fixed before you continue.** Put the report in `docs/visual-diff.md`.
3. **Grep checks** (must return nothing): bare `<table` outside DataGrid; `#000`; `box-shadow` on cards; `tabular-nums`; `font-variant-numeric`; hex colours in `src/components` or `src/app`; `lucide`, `heroicons`, `react-icons`; emoji used as icons; `outline: none` without a replacement focus style.
4. **Accessibility:** axe-core on the gallery: zero serious or critical. Keyboard walk-through of Dialog (focus trap, Esc), Menu, Select, Combobox, DataGrid filters, Tabs, Accordion. 200% zoom and 320px wide without horizontal page scroll (grid scrolls inside itself). Lighthouse accessibility 95+.
5. **Theme:** wrap one section in `data-theme="navy"` and confirm it re-themes with no code changes.
6. `pnpm build` and `pnpm lint` and `tsc --noEmit` pass with no errors.

## 8. WORKING RULES

- Work in this order: setup, tokens and globals, icons, primitives (Button, Badge, Input, Checkbox, Radio, Switch), overlays and menus, DataGrid family, layout and navigation, marketplace components, loaders and transitions, shells, gallery, verification. Commit after each group.
- Never invent a class, token, colour, size, icon or string that is not in the kit. If the kit lacks something, add it to a "Questions" list and continue with the closest kit pattern.
- Do not "improve" the design, simplify the CSS, merge classes, rename `sa-*` classes, convert the bundle to Tailwind utilities or swap in shadcn defaults. shadcn/Radix are used only for behaviour; the **look comes from `saudaro-bundle.css`**.
- Keep components presentational and accessible; no business logic in `components/ui`.
- Final message: list what was built, the visual-diff result per component, any "Questions", and anything you could not match exactly and why.
