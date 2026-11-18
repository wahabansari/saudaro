The default for every list of records (RFQs, quotations, products, documents). Built on a `<table>` with `role="grid"` only when cells are editable; read-only grids stay a plain table with `aria-sort`. Cells never wrap: long text is cut with an ellipsis and the full value sits in `title`. Wide tables scroll horizontally inside the grid while the header, the checkbox and reference columns, and the actions column stay in place.

## Anatomy
1. **Toolbar** (64px): title with total, global search, Columns, density, Export, primary action. Selecting a row swaps it for the **bulk bar**.
2. **Filter chips** (48px): one chip per active column filter, each removable, plus Clear all.
3. **Header** (44px, sticky): label on the left; one **filter button on the right of every header cell** (no sort arrows). A filter button with a dot means that column is filtered.
4. **Body** (row 40 / 48 / 56px): nowrap, ellipsis at 320px max, lining numbers, status as badge, row actions in the sticky last column.
5. **Footer** (60px): rows per page dropdown, range, pagination.

## Header filters
Each filter opens a dropdown under the header cell (`FilterDropdown`): text (operator + value), enum (search + select all + counts), number range, date range. Apply commits; Clear resets that column. Search inside a filter filters the option list only. The global search and column filters combine with AND; chips show the combined state.

## Scrolling
`.sa-grid__scroll` owns both scrollbars (`max-height` sets the vertical limit). `position: sticky` keeps header (top), checkbox and reference (left) and actions (right). Edge shadows mark stuck columns. Scroll area is keyboard focusable (`tabindex="0"`) with a label. At 320px width the grid scrolls; it never reflows into cards.

## States
Default, hover row, selected row (`aria-selected`), loading (6 skeleton rows, header stays), empty (no results with Clear all filters), error (inline alert above the grid, rows kept), bulk selection.

## Rules
- Never wrap cell text. Truncate with ellipsis and expose the full value in `title` and on focus.
- Filter popovers render in a portal so the scroll container never clips them.
- No per-column sort arrows; the grid has filters only.
- Dropdowns open and close with the shared overlay motion (200ms in, 140ms out).

**Build with:** TanStack Table v8 (filtering, column pinning, row selection, faceted values) with a virtualised body over 200 rows; Radix `Popover` for filters; shadcn `Table` styling.. Server-side filtering sends `?status=open,quoted&q=basmati&sort=-ref&page=2`.
