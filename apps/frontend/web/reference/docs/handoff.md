# Build handoff

The design system is final for v1. Start building the UI from this page. Everything below is decided; change it only through the design system, not per page.

## 1. Stack
| Layer | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript, React Server Components by default |
| Styling | Tailwind CSS with the tokens below mapped into `tailwind.config`; `bundle.css` classes (`sa-*`) are the visual reference |
| Primitives | Radix UI (Dialog, Popover, DropdownMenu, Select, Tabs, Tooltip, Checkbox, RadioGroup, Switch, Slider), shadcn/ui wrappers |
| Data | TanStack Table v8 (filtering, pinning, selection, faceted values) for every list; TanStack Query for fetching |
| Forms | React Hook Form + Zod |
| Icons | `@phosphor-icons/react` Duotone only, sizes 16, 20, 24, 32, 48 |
| Font | Inter variable (self-hosted `InterVariable.woff2`), no second typeface |
| Motion | CSS transitions, `next-view-transitions` for route changes, no animation library |

## 2. Tokens (source of truth: `tokens.json`)
- **Colour 60/30/10:** white surfaces, grey (30), blue (10). Black is always ink `#1A2B3C`. Action blue `primary-700`. Navy only in hero bands via `.sa-ground`. Header and footer are `grey-100`.
- **Surfaces:** page `grey-50`, card `white`, showcase body `grey-100`.
- **Numerals:** `font-feature-settings: "lnum","cv05","calt"`, weight one step heavier than text, `letter-spacing: -0.02em`. Never `tnum` (adds a foot to `1`). Right-align numbers in tables.
- **Radius:** controls 8, cards 14 (inner body 11), pills full.
- **Borders:** cards use a 2px `grey-200` border and no shadow. Shadows are only for floating layers (menu, popover, dialog, toast).
- **Frame pattern:** white card, 3px padding, name on top with one line under it, then a `grey-100` body with a 2px white border holding the content.
- **Controls:** 40px default, 32px `sm` in tables and toolbars, 48px `lg`. Touch 44px.

## 3. Motion
- Overlays open in 280ms and close in 170ms with `cubic-bezier(.22,1,.36,1)`; translate -8px and scale .96 to rest. Menu items, options and filter fields fade in with a 24ms stagger.
- Sheet slides 260ms, toast rises 12px, scrim fades. Route changes: View Transitions (`sa-hero`, `sa-head`), branded PageLoader after 300ms and shown at least 400ms.
- Everything honours `prefers-reduced-motion`.

## 4. Behaviour rules that are easy to miss
- **Checkbox / radio (forms):** selecting fills a primary pill from the box across the label, label turns white. In tables, bulk bar, filter lists and option lists only the box fills; the text never changes.
- **Dropdown selection:** no background or text colour change on the selected row, only the checkbox or a trailing check icon.
- **DataGrid:** no sort arrows, filters only, on the right of each header. Cells never wrap (ellipsis, full value in `title`). Header, checkbox + reference column and actions column are sticky. Empty state is centred in the grid. Loading shows 7 skeleton rows shaped like real rows.
- **Status** is always icon + text, never colour alone.
- **Page loader / transitions:** see PageLoader and PageTransition.

## 5. Component inventory (62)
- **Actions** (3): Button, ButtonGroup, IconButton
- **Data display** (8): Avatar, Card, Chip, Divider, Rating, Statistic, Tag, Timeline
- **Data grid** (4): DataGrid, FilterDropdown, GridMenus, GridStates
- **Feedback** (3): Alert, Badge, Toast
- **Forms** (9): Checkbox, FileUpload, Input, NumberInput, Radio, Select, Slider, Switch, Textarea
- **Layout** (3): Banner, PageHeader, Sidebar
- **Loaders** (3): Progress, Skeleton, Spinner
- **Marketplace** (7): DocumentTile, ExporterCard, NegotiationThread, ProductCard, QuotationCard, RfqCard, VerificationBadge
- **Menus & dropdowns** (6): Combobox, CommandPalette, DatePicker, Menu, MultiSelect, UserMenu
- **Navigation** (7): Accordion, Breadcrumb, Footer, Navbar, Pagination, Stepper, Tabs
- **Overlays** (4): Dialog, Popover, Sheet, Tooltip
- **Page loader** (3): PageLoader, PageTransition, RouteProgress
- **Placeholders** (2): EmptyState, Placeholder

Each folder in `components/` has a `README.md` (anatomy, states, rules, what to build with) and a `preview.html`.

## 6. Suggested build order
1. App shell: tokens, Inter, `Navbar` / `Footer` (public), `Sidebar` + `PageHeader` (workspace), `PageLoader`, `RouteProgress`, toasts.
2. Public pages: Home, Catalog (`ProductCard`, `FilterDropdown`, `Pagination`), Exporter profile (`ExporterCard`, `DocumentTile`, `VerificationBadge`).
3. Trade flow: RFQ create (Stepper, forms, FileUpload), RFQ detail, Quotation, Negotiation (`NegotiationThread`, `QuotationCard`).
4. Workspace lists: RFQs, Quotations, Products, Documents on `DataGrid`.
5. Account, verification, settings, empty and error states.

## 7. Definition of done for any page
- Uses only components and tokens from this system.
- Keyboard only, from top to bottom, with visible focus.
- 200% zoom and 320px width without loss.
- Statuses readable in greyscale.
- axe: no serious issues. Lighthouse accessibility 95+.
