Opens under the filter button in a column header, aligned to the cell. Four types cover every column: **text** (condition + value), **enum** (searchable checkbox list with counts and Select all), **number range** (min, max, slider) and **date range** (from, to, presets).

## Behaviour
- Search inside the panel filters only the option list; matches are highlighted with `mark`.
- The panel keeps its footer visible while the list scrolls (max 200px).
- Apply commits and closes; Esc or an outside click closes without applying; Clear resets only this column.
- Focus moves to the search field (or first input) on open and returns to the filter button on close.
- Opens in 200ms, closes in 140ms, same curve as every overlay.

## Accessibility
`role="dialog"` with `aria-label="Filter <column>"`, the button has `aria-haspopup="dialog"` and `aria-expanded`. All controls reachable by Tab. Counts are text, not colour.

**Build with:** Radix `Popover` (portal) + shadcn `Command` for the searchable list; TanStack Table faceted unique values for counts.. 
