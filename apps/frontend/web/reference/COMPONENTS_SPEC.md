# Component specification (62)


---

# Accordion

Markup reference: `reference/components/Accordion/preview.html`

Reveals content a section at a time. One or many open.

## Rules
Header is a button with `aria-expanded`; chevron rotates 180° over 200ms; panel height animates and respects reduced motion.

**Build with:** shadcn `Accordion` (Radix Accordion).. 


---

# Alert

Markup reference: `reference/components/Alert/preview.html`

Persistent message tied to the content around it: verification needed, quotation expires soon, form-level error.

## Rules
Icon, bold title, one or two sentences, optional link. Body text is `ink` for contrast; the tone shows on the border, icon and title.

**Build with:** shadcn `Alert`.. 


---

# Avatar

Markup reference: `reference/components/Avatar/preview.html`

Identifies a user or company. People are circles, companies are rounded squares (`sa-avatar--sq`).

## Sizes
32 (`--sm`), 40 (default), 56 (`--lg`). Initials are 1 or 2 letters, 600 weight, on `action-soft` with a soft border; `--solid` is navy with white text (12:1).

## Rules
Set `alt` for photos; initials are `aria-hidden` when the name is beside them.

**Build with:** shadcn `Avatar` (Radix Avatar).. 


---

# Badge

Markup reference: `reference/components/Badge/preview.html`

Compact label for status, category or count. The label text is always present; colour reinforces it, never carries it.

## Tones
Neutral, info, success, warning, danger, outline, solid. Sizes: default 24px, large 28px. Pill shape (`sa-badge--pill`) for counts and tags.

## Status mapping
Use exactly these values from the API docs. Never invent a status or tone.
### RFQ (`rfqs.status`)
| Value | Tone | Label |
|---|---|---|
| `draft` | neutral | Draft |
| `published` | info | Published |
| `paused` | warning | Paused |
| `closed` | neutral | Closed |
| `expired` | outline | Expired |
| `cancelled` | danger | Cancelled |
| `awarded` | success | Awarded |

### Quotation (`quotations.status`)
| Value | Tone | Label |
|---|---|---|
| `draft` | neutral | Draft |
| `submitted` | info | Submitted |
| `under_negotiation` | warning | Under negotiation |
| `accepted` | success | Accepted |
| `rejected` | danger | Rejected |
| `withdrawn` | outline | Withdrawn |
| `expired` | outline | Expired |
| `superseded` | outline | Superseded |

### Deal (`deals.status`)
| Value | Tone | Label |
|---|---|---|
| `active` | info | Active |
| `in_production` | info | In production |
| `shipped` | info | Shipped |
| `delivered` | success | Delivered |
| `completed` | success | Completed |
| `cancelled` | danger | Cancelled |
| `disputed` | danger | Disputed |

### Verification case (`verification_cases.status`)
| Value | Tone | Label |
|---|---|---|
| `draft` | neutral | Draft |
| `submitted` | info | Submitted |
| `in_review` | info | In review |
| `needs_info` | warning | Needs info |
| `approved` | success | Approved |
| `rejected` | danger | Rejected |
| `expired` | outline | Expired |
| `revoked` | danger | Revoked |


## Rules
- Each tone has an icon so it survives greyscale and colour-blindness.
- Sentence case, no all-caps, snake_case becomes words.
- Badges are not buttons. If clickable, use a Chip.
- Text and fill pairs are verified: success 6.0:1, warning 7.2:1, danger 5.7:1, info 9.1:1.

**Build with:** shadcn `Badge` with `cva` tones.. Wrap status values in a single `StatusBadge` helper that holds the mapping above.


---

# Banner

Markup reference: `reference/components/Banner/preview.html`

A persistent message about the whole page or account (verification pending, maintenance, expiring documents). Different from Alert (inline, about one thing) and Toast (temporary).

## Rules
- Icon, one sentence, one optional action, optional dismiss.
- Warning banners are not dismissible until the cause is fixed.
- `role="status"`; urgent ones use `role="alert"`.

**Build with:** Custom on shadcn `Alert`.. 


---

# Breadcrumb

Markup reference: `reference/components/Breadcrumb/preview.html`

Trail from the home page to the current page, on every page more than one level deep.

## Rules
Use `nav aria-label="Breadcrumb"` with an ordered list; the last item has `aria-current="page"` and is not a link. On mobile collapse the middle to "…".

**Build with:** shadcn `Breadcrumb`.. 


---

# Button

Markup reference: `reference/components/Button/preview.html`

Triggers an action or navigates. One primary button per view region. Anatomy follows Ant Design (primary, default, dashed, text, link; 32/40/48 heights; 6px radius) with Untitled UI refinements (1px border, soft shadow, subtle inset edge on filled buttons).

## Variants
| Variant | Class | Use on | Meaning |
|---|---|---|---|
| Primary | `sa-btn` | card, light ground | The one main action: Submit RFQ, Send quotation. |
| Default | `sa-btn sa-btn--secondary` | card | Supporting action: Save draft. White, grey border, ink text. |
| Outline | `sa-btn sa-btn--outline` | card | Alternative action in brand colour: Compare. |
| Dashed | `sa-btn sa-btn--dashed` | card | Add something: Add document, Add item. |
| Text | `sa-btn sa-btn--text` | card | Tertiary: Cancel, row actions. |
| Link | `sa-btn sa-btn--link` | in text | Reads as a link. |
| Danger | `sa-btn sa-btn--danger` | card | Withdraw, delete. Always confirmed in a Dialog. |
| Danger soft | `sa-btn sa-btn--danger-soft` | card | Lower-emphasis destructive action. |
| Inverse family | `sa-btn--inverse`, `--inverse-outline`, `--inverse-ghost` | **navy ground** | Primary, secondary, tertiary on navy. White fill with ink text (14.4:1). |

On navy ground wrap in `sa-ground` so focus rings switch to `focus-on-ground`.

## Sizes
`sm` 32px (dense tables, toolbars), `md` 40px (default), `lg` 48px (hero forms, mobile primary). On touch devices (`pointer: coarse`) `md` becomes 44px. Horizontal padding 12 / 16 / 20px; gap between icon and label 8px.

## States
Default, hover, active, `:focus-visible` (2px ring, 2px offset), disabled (`disabled` or `aria-disabled="true"`: grey fill, 5.2:1 label), loading (`aria-busy="true"`, spinner replaces label, width unchanged).

## Rules
- Label is a verb plus object: "Submit RFQ".
- Loading blocks repeat clicks; announce completion with a Toast.
- Prefer an enabled button that explains what is missing over disabled.
- Never two primary buttons in one region.

**Build with:** shadcn `Button` with `cva` variants named as above; `asChild` for links (Radix Slot).. Keep `type="button"` explicit.


---

# ButtonGroup

Markup reference: `reference/components/ButtonGroup/preview.html`

Joined buttons for a single-choice switch (list/grid, currency, unit). Selected item uses `aria-pressed="true"`.

## Rules
- 2 to 4 items. More than that is a Tabs or Select.
- Selection must be visible without colour: the filled item also has a check or a bolder weight in implementation.

**Build with:** shadcn `ToggleGroup` (Radix ToggleGroup).. 


---

# Card

Markup reference: `reference/components/Card/preview.html`

Container for a product, a company, a quotation. On the navy theme cards are grey (`card`), which is the 30% of the ratio; on the light theme they are white.

## Variants
Static (`sa-card`), interactive (`sa-card--link`, lifts 2px and shadow grows on hover), flush (`sa-card--flush`, media edge to edge).

## Rules
- Padding 24px (16px compact). Radius 12px (`radius-xl`). Shadow `shadow-sm`, 1px `card-border`.
- An interactive card has one link target (the title) stretched over the card; inner buttons stay separate.
- Text on cards uses `card-text` / `card-muted` only.

**Build with:** shadcn `Card`.. 


---

# Checkbox

Markup reference: `reference/components/Checkbox/preview.html`

Pick zero or more options, filter facets, agreements.

## States
Unchecked, checked, indeterminate, focus, disabled, invalid.

## Rules
- Box is 20px; the whole label row (36px, 44px on touch) is the hit target.
- Box border `grey-450`, checked fill `action` with a white check (11:1).
- Group with `fieldset` and `legend`.

**Build with:** shadcn `Checkbox` (Radix Checkbox).. 


---

# Chip

Markup reference: `reference/components/Chip/preview.html`

A pill-shaped control for filters and applied tags. Selected state uses `aria-pressed` and a filled style.

## Rules
Height 32px (44px on touch) with 8px between chips. Removable chips have a separate "Remove filter: X" button. Do not use for status; use Badge.

**Build with:** shadcn `Toggle` / `Badge` with button role.. 


---

# Combobox

Markup reference: `reference/components/Combobox/preview.html`

Use instead of Select when the list has more than 8 options. The trigger looks like an input; the panel has a search field and a scrollable listbox (max 224px).

## Behaviour
- Typing filters instantly; matches are highlighted; no match shows an empty message with the typed text.
- Arrow keys move the active option, Enter selects and closes, Esc closes.
- Selected option shows a check and soft blue fill. The trigger shows the value or the placeholder.
- Async lists show a Spinner row and keep the typed text.

## Accessibility
ARIA 1.2 combobox pattern: input `role="combobox"` `aria-expanded` `aria-controls` `aria-activedescendant`; options `role="option"` `aria-selected`.

**Build with:** shadcn `Combobox` (Popover + Command).. Debounce server search 250ms.


---

# CommandPalette

Markup reference: `reference/components/CommandPalette/preview.html`

A dialog with a search field and grouped results. Opens with <kbd>Ctrl</kbd> + <kbd>K</kbd> (<kbd>⌘</kbd> + <kbd>K</kbd> on Mac) from anywhere.

## Behaviour
- Results group as Go to, Create, Recent; typing filters across groups and highlights matches.
- ↑ ↓ move, ↵ runs, Esc closes. The footer always shows these hints.
- Opens with the dialog motion (scrim fades, panel rises 6px).

## Accessibility
`role="dialog"` with a combobox inside; results are options with `aria-selected`.

**Build with:** shadcn `Command` in `Dialog` (cmdk).. 


---

# DataGrid

Markup reference: `reference/components/DataGrid/preview.html`

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


---

# DatePicker

Markup reference: `reference/components/DatePicker/preview.html`

Input with a calendar icon opens a month grid. Range mode fills the days between start and end with a soft blue band and square caps.

## States
Today (blue ring), selected start/end (solid blue), in range (soft blue), outside month (grey 5.2:1), disabled (struck through, not selectable).

## Rules
- The input also accepts typing (`DD MMM YYYY`); the calendar is an aid.
- Day cells are 40px (44px on touch). Arrow keys move by day, PageUp/PageDown by month.
- Past dates are disabled for deadlines; the reason shows in the helper text.

**Build with:** shadcn `Calendar` (react-day-picker) in a Popover.. 


---

# Dialog

Markup reference: `reference/components/Dialog/preview.html`

Blocks the page for a decision: confirm, withdraw, accept quotation.

## Anatomy
Title, one-sentence body, actions right-aligned (cancel left of confirm). Destructive confirmations use the Destructive button and name the object.

## Rules
- Focus moves into the dialog, is trapped, and returns to the trigger on close (Radix does this).
- `Esc` closes; scrim click closes unless there are unsaved changes.
- Max width 480px; long forms use a Sheet.
- Entry: fade and 8px rise over 200ms; reduced motion: fade only.

**Build with:** shadcn `Dialog` / `AlertDialog` (Radix Dialog).. 


---

# Divider

Markup reference: `reference/components/Divider/preview.html`

Separates groups of content. A hairline of `grey-200`. With text for "or" and section labels.

## Rules
Decorative (`role="separator"` only when it divides interactive groups). Do not stack with borders.

**Build with:** shadcn `Separator` (Radix Separator).. 


---

# DocumentTile

Markup reference: `reference/components/DocumentTile/preview.html`

The exporter's sample documents, shown beside the product so importers find everything without asking. This is the core differentiator of SAUDARO.

## Anatomy
Type icon, file name, document type label (from `DEAL_DOCUMENT_TYPES`: certificate, product_specification, packing_list, commercial_invoice, bill_of_lading, inspection_report, …), size and date in mono, state badge, Preview and Download buttons.

## States
Available, locked to verified importers (lock icon and "Verified importers only"), expired (warning badge with date), uploading.

## Rules
- File names truncate at the end; the full name is in a Tooltip and in the preview.
- Download is a real link with `download` attribute and file size in the label.
- Group tiles by document type with a heading.

**Build with:** Custom on shadcn `Card` and `Button`.. 


---

# EmptyState

Markup reference: `reference/components/EmptyState/preview.html`

Explains why a region is empty and offers the next step. Every list, table, thread and document area has one.

## Anatomy
Icon in a tinted disc, title (what is empty), one sentence (why, what to do), one primary action, optional secondary link.

## Variants
- **First use**: "No RFQs yet" + Post an RFQ.
- **No results**: "No exporters match" + Clear filters.
- **No permission**: "You can view but not edit" with who to ask.
- **Error**: "Could not load" + Try again.

## Rules
- Title states the fact, not a joke. Sentence max 2 lines.
- Exactly one primary action.
- No illustration is required: the icon disc is the brand pattern.

**Build with:** Custom block composed from shadcn `Button`.. 


---

# ExporterCard

Markup reference: `reference/components/ExporterCard/preview.html`

Directory entry for an exporter or importer company.

## Anatomy
Logo (square avatar), name, country, VerificationBadge, three category chips, readiness line ("8 of 8 standard documents"), View profile button.

## Rules
Show document readiness as text and a Progress bar. Never display a rating without the number of reviews.

**Build with:** shadcn `Card` + `Avatar`.. 


---

# FileUpload

Markup reference: `reference/components/FileUpload/preview.html`

Upload one or many documents. This is the heart of the exporter experience: documents live beside the product so importers never have to ask.

## States
Idle, drag-over, uploading (Progress per file), done (Document tile), error (message and Retry).

## Rules
- The whole zone is a button and keyboard reachable.
- State accepted types and the size limit in the zone ("PDF, JPG, PNG, up to 10 MB").
- Show a document type select per file (certificate, product_specification, packing_list, …).
- Never auto-publish; show who can see each file.

**Build with:** Custom composed from shadcn `Button` and `Progress`; use react-dropzone.. 


---

# FilterDropdown

Markup reference: `reference/components/FilterDropdown/preview.html`

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


---

# Footer

Markup reference: `reference/components/Footer/preview.html`

Four link columns, legal links, language. Same light grey as the header.

## Rules
Navy lockup, link text `chrome-text` (underlined on hover and focus), secondary text `chrome-muted` (6.1:1+). No link below 44px tap height on mobile.

**Build with:** Custom.. 


---

# GridMenus

Markup reference: `reference/components/GridMenus/preview.html`

Three menus that complete the data grid.

## Column menu
Opens from the header cell (right-click or long press on touch). Filter, pin, hide.

## Column picker
Toolbar button. Searchable checklist; the reference column is locked (disabled) so a row is always identifiable.

## Row actions
The `more` icon button in the sticky actions column. First item is the default action; destructive item last, separated, in danger colour.

## Rules
Same overlay motion as all menus. Arrow keys move through items, Enter activates, Esc closes and returns focus to the trigger.

**Build with:** Radix `DropdownMenu` and `Popover`.. 


---

# GridStates

Markup reference: `reference/components/GridStates/preview.html`

Every grid ships these states.

## Loading
Header and toolbar stay; 6 skeleton rows replace the body. `aria-busy="true"` on the scroll region.

## Empty / no results
Explains why and offers Clear all filters. A first-use empty state offers the create action instead.

## Error
An inline Alert above the grid with Retry. Last loaded rows stay visible and dimmed.

## Density
Compact 40, default 48, comfortable 56. Remembered per user.

## Rules
Loading never shifts the layout: skeleton row height equals the row height.

**Build with:** shadcn `Skeleton`, `Alert`.. 


---

# IconButton

Markup reference: `reference/components/IconButton/preview.html`

An icon-only control: close, more, favourite, copy. Always has `aria-label`, and a Tooltip when the meaning is not obvious.

## Variants
Ghost (default `sa-iconbtn`), outline (`sa-iconbtn--outline`), filled (`sa-iconbtn--filled`), small (`sa-iconbtn--sm`, 32px, desktop only). Default 40px (44px on touch); also an outline variant.

## Rules
- `aria-label` is required; the icon is `aria-hidden`.
- Toggle icon buttons use `aria-pressed`.
- Do not use for primary actions that need a label.

**Build with:** shadcn `Button size="icon"`.. 


---

# Input

Markup reference: `reference/components/Input/preview.html`

Text, number, email, search and phone entry.

## Anatomy
Label above (always visible), field, optional hint, error message. Required fields show a red asterisk and `aria-required`.

## States
Default, hover, focus (ring + action border), filled, invalid (2px danger border, icon and message), disabled, read-only.

## Rules
- Never use placeholder as a label. Placeholder is an example value (`grey-500` on white, 5.2:1).
- On touch the font becomes 16px to stop iOS zoom.
- Border is `grey-450` (3.5:1 against white, needs 3:1). Height 40px (32 small, 48 large; 44 on touch). Focus: 2px ring plus a 5px `focus-halo`.
- Errors say what to do: "Enter a quantity of 1 or more".
- Link errors with `aria-describedby`; set `aria-invalid="true"`.
- Numbers, prices and HS codes use `sa-mono`.

**Build with:** shadcn `Input` + `Label` + `FormMessage` (react-hook-form).. 


---

# Menu

Markup reference: `reference/components/Menu/preview.html`

A list of actions opened by a button (`DropdownMenu`) or a right-click (`ContextMenu`). Same panel, same motion.

## Variants
| Variant | Use |
|---|---|
| Action menu | Row and card actions. Groups with a label, shortcut hints on the right, danger item last. |
| Choice menu | `menuitemradio` for one-of (sort), `menuitemcheckbox` for toggles. Selected items show a check and a soft blue fill. |
| Submenu | Item with a chevron on the right; opens on hover after 150ms or on →. |

## Motion (all menus, selects, popovers, tooltips)
Enter: opacity 0→1, translateY(-6px)→0, scale .97→1 over **200ms** on `cubic-bezier(.16,1,.3,1)`. Exit: **140ms** ease-in, no scale-up. Origin is the trigger edge. Reduced motion: no transform, 1ms fade.

## Rules
- Item height 36px, panel padding 4px, radius 10px, shadow-md. Min width 220px.
- Opens below the trigger, flips up when there is no room; 6px gap.
- Focus goes to the first item (or the checked one); arrows, Home, End, type-ahead. Esc closes and restores focus.
- Disabled items stay visible with `aria-disabled`.

**Build with:** Radix `DropdownMenu` / `ContextMenu` with `data-state` driving `sa-pop-in` / `sa-pop-out`.. The CSS-only `.sa-pop` wrapper (open on `:focus-within`) is for documentation previews only.


---

# MultiSelect

Markup reference: `reference/components/MultiSelect/preview.html`

Pick several values (certifications, incoterms, destination markets). Selected values appear as tags in the trigger and wrap to a second line; beyond 3 the trigger shows `+n`.

## Behaviour
- Options are checkboxes; the panel stays open while picking and closes on Esc or outside click.
- Backspace in the empty search removes the last tag.
- Footer shows how many are selected and a Clear action.

## Rules
Tags are removable by keyboard (focus the tag, Delete). Panel and trigger share width.

**Build with:** shadcn `Command` multi-select pattern with `Badge`/`Tag`.. 


---

# Navbar

Markup reference: `reference/components/Navbar/preview.html`

Sticky 72px header on `chrome` (light grey, never primary blue). Logo left, links, Sign in (text button) and Post an RFQ (primary).

## Rules
- Contains a skip link "Skip to content" as the first focusable item.
- Current page link has `aria-current="page"` and a primary underline.
- Mobile: logo, search icon, menu button; menu opens a Sheet from the left.
- Logo is the navy horizontal lockup.

**Build with:** Custom on shadcn `NavigationMenu` (Radix) and `Sheet`.. 


---

# NegotiationThread

Markup reference: `reference/components/NegotiationThread/preview.html`

The negotiation view for one quotation. Events come from `negotiation_events`: counter_offer, clarification_request, clarification_response, revision_submitted, accept_intent, decline, note.

## Anatomy
Message bubbles (mine on the right, `action` fill; theirs on the left, `card-sunken`), offer cards for counter offers showing changed fields, system events as centred captions, composer with attachment and Send.

## Rules
- Counter-offer cards show a before/after of each changed term.
- Every message shows author, company and time (caption, mono for time).
- The thread is append-only; edits are not offered, only a new message.
- New messages announce via `aria-live="polite"`.

**Build with:** Custom composed from Card, Badge, Textarea and Button.. 


---

# NumberInput

Markup reference: `reference/components/NumberInput/preview.html`

A stepper for small integer ranges (quantity, number of containers). Typing is always allowed; the buttons are a convenience.

## Rules
- Buttons are 40px wide, same height as the field; lining digits.
- Hold to repeat after 500ms. Min and max disable the matching button.
- Unit lives in the label or a suffix, not in the field.

**Build with:** Native `input type="number"` with custom steppers.. 


---

# PageHeader

Markup reference: `reference/components/PageHeader/preview.html`

Opens every workspace page: breadcrumb, h1, one-line description, page actions on the right and optional tabs below.

## Rules
- One `h1` per page; description max 60 characters per line.
- One primary action on the right; secondary actions to its left.
- Tabs sit on the bottom border; the header does not scroll away on desktop.

**Build with:** Custom.. 


---

# PageLoader

Markup reference: `reference/components/PageLoader/preview.html`

The SAUDARO loader reuses the logo: the **cargo box stays still while the export arrow slides out to the right and the import arrow slides in from the left**, passing through the openings in the walls. A thin indeterminate bar and a three-dot caption sit below. It is the same shape as the brand mark, so it cannot be mistaken for another product.

## When to show
| Situation | Component |
|---|---|
| Navigation under 300ms | Nothing (the view transition covers it). |
| Navigation 300ms to 2s | Route progress bar at the top of the page. |
| First load, or over 2s | Page loader (full screen, or inline in a panel). |
| Content refresh | Skeleton, never the page loader. |

## Behaviour
- Fades in over 200ms **after a 300ms delay** so quick loads never flash it.
- Once shown, stays at least 400ms to avoid flicker.
- `role="status"` and `aria-live="polite"` with a text caption such as "Loading RFQs".
- Reduced motion: the arrows stop; the bar and dots pulse softly.

## Spec
Mark 72px. Arrow loop 1.5s on the shared curve, stagger none (both arrows move together in opposite directions). Breath scale 1 → .94 over 2.4s. Bar 160 × 3px.

**Build with:** A client `loading.tsx` per route group in the Next.js App Router plus `<Suspense fallback={<PageLoader/>}>`.. 


---

# PageTransition

Markup reference: `reference/components/PageTransition/preview.html`

Navigation uses the **View Transitions API** so pages animate without a JS animation library. One line turns it on for every same-origin navigation; named elements get their own motion.

## Enable
```css
@view-transition { navigation: auto; }
```
For SPA route changes call `document.startViewTransition(() => navigate(href))` (Next.js: `next-view-transitions`).

## The three transitions
| Name | CSS | Result |
|---|---|---|
| `root` | `::view-transition-old(root)` fades up and out (220ms ease-in); `::view-transition-new(root)` rises 14px and fades in (420ms, `cubic-bezier(.16,1,.3,1)`) | Every page change |
| `sa-hero` | `view-transition-name: sa-hero` on the product card thumbnail and on the detail hero | The thumbnail grows into the hero image |
| `sa-head` | `view-transition-name: sa-head` on the app header; group animation 0s | Header stays put, does not cross-fade |

## Rules
- Total under 500ms. Opacity and transform only.
- Names must be unique per page: use `style="view-transition-name: sa-hero-{id}"` on lists, and set it only on the clicked card.
- Reduced motion: `::view-transition-*` animations are removed; the page swaps instantly.
- Browsers without support navigate normally; nothing breaks.

**Build with:** CSS in `globals.css` (already in `bundle.css`), `next-view-transitions` for the App Router.. The three previews on the right loop the real keyframes. Open the PageLoader preview in the design system for a live `startViewTransition` demo.


---

# Pagination

Markup reference: `reference/components/Pagination/preview.html`

Moves through result pages. Show first, last, current and two neighbours; ellipsis between.

## Rules
Items are 32px (Ant Design style, bordered; 44px on touch). `nav aria-label="Pagination"`; current has `aria-current="page"` and a filled style. Pair with a "Showing 21–40 of 312" line. Infinite scroll is not used for catalogs.

**Build with:** shadcn `Pagination`.. 


---

# Placeholder

Markup reference: `reference/components/Placeholder/preview.html`

Fallback shapes for missing product photos, company logos and avatars. Never leave a broken image.

## Rules
- Product image: 4:3 `card-sunken` block with an image icon.
- Company logo: square avatar with two-letter initials on `action`.
- Avatar: circle with initials; person photos are circles, company logos are rounded squares (`sa-avatar--sq`).
- Always set meaningful `alt` text on real images; placeholders are `aria-hidden` when the name is nearby.

**Build with:** shadcn `Avatar` (Radix Avatar fallback).. 


---

# Popover

Markup reference: `reference/components/Popover/preview.html`

Anchored panel opened by click: company preview, filter set, help.

## Rules
Has a title, closes on Esc and outside click, focus moves in and returns. Width max 320px. Never holds the only path to a primary action.

**Build with:** shadcn `Popover` (Radix Popover).. 


---

# ProductCard

Markup reference: `reference/components/ProductCard/preview.html`

The main catalog unit. It must answer "can I buy this and can I trust it" at a glance.

## Anatomy
Photo (4:3), title, exporter name with VerificationBadge, price range and unit (mono), MOQ, Incoterm, document count chip ("8 documents").

## Rules
- Price is "From USD 980 / MT"; always unit and currency.
- Document count is a link target: it jumps to the Documents tab.
- One link target (title). Favourite is an IconButton with `aria-pressed`.
- Loading uses the Skeleton; missing photo uses Placeholder.

**Build with:** shadcn `Card` + `Badge`.. 


---

# Progress

Markup reference: `reference/components/Progress/preview.html`

Shows measurable progress (file upload, RFQ completion) or an indeterminate wait.

## Rules
- Use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, or no `aria-valuenow` when indeterminate.
- Show the percentage or step as text next to the bar.
- Bar fill is `action` on a `card-sunken` track.

**Build with:** shadcn `Progress` (Radix Progress).. 


---

# QuotationCard

Markup reference: `reference/components/QuotationCard/preview.html`

Summary of one quotation, shown to the importer when comparing and to the exporter when tracking.

## Anatomy
Reference (mono), exporter, status Badge, price per unit and total (mono, right aligned), Incoterm, payment terms, validity date, attached documents count, actions: Accept, Counter, Ask a question.

## Rules
- Accept is Primary and opens a confirm Dialog showing the final terms.
- Show "Valid until" with date; under 48 hours uses a warning badge.
- Revisions show "Revision 3" and link to history (append-only, from quotation_status_history).

**Build with:** shadcn `Card` + `Badge` + `Dialog`.. 


---

# Radio

Markup reference: `reference/components/Radio/preview.html`

Pick exactly one option when all options should be visible.

## Rules
Group in `fieldset` with `legend`; arrow keys move selection; the selected dot is a thick border so it reads without colour.

**Build with:** shadcn `RadioGroup` (Radix RadioGroup).. 


---

# Rating

Markup reference: `reference/components/Rating/preview.html`

Shows 0 to 5 stars with the number and the count of reviews beside it, as text.

## Rules
Star fill is `warning-800` with an outlined off state (`grey-300`); always show "4.6 (128 reviews)". For input, use radio buttons with visually hidden labels.

**Build with:** Custom.. 


---

# RfqCard

Markup reference: `reference/components/RfqCard/preview.html`

List entry for a published RFQ (`rfqs.status = published`).

## Anatomy
Title, buyer company with VerificationBadge, product category, quantity and unit, target Incoterm and destination port, deadline, quotation count, status Badge, primary action "Send quotation".

## Rules
- Deadline is shown as date and "closes in 3 days" (text), turning `warning` under 48 hours.
- Quotation count is a number only; never show competitor prices.
- Owner view replaces the action with "View quotations".

**Build with:** shadcn `Card` + `Badge` + `Button`.. 


---

# RouteProgress

Markup reference: `reference/components/RouteProgress/preview.html`

A 3px bar fixed to the top of the viewport while the next route loads. Indeterminate by default; determinate for uploads.

## Rules
- Starts after 120ms; completes and fades in 200ms.
- Colour is `action`; the head glows to `primary-400`.
- Never blocks interaction. `role="progressbar"` with `aria-busy` on the main region.

**Build with:** NProgress-style hook on the Next.js router events.. 


---

# Select

Markup reference: `reference/components/Select/preview.html`

Choose one option: country, port, Incoterm, currency, unit.

## Rules
- Fewer than 5 options and all must be seen: use Radio.
- More than 15 options or searchable data (countries, HS codes): use a Combobox (Select plus search input).
- Selected value is shown in the field; the placeholder is "Select…".
- Dropdown list uses the Menu styles.

**Build with:** shadcn `Select` (Radix Select) or `Combobox` (cmdk).. 


---

# Sheet

Markup reference: `reference/components/Sheet/preview.html`

Slides from the right (left for navigation on mobile). Use for filters, document preview and long forms where the page behind still matters.

## Rules
Width 420px desktop, full width on mobile. Same focus rules as Dialog. Entry slides 24px and fades in 320ms.

**Build with:** shadcn `Sheet` (Radix Dialog).. 


---

# Sidebar

Markup reference: `reference/components/Sidebar/preview.html`

Primary navigation for the signed-in workspace. Expanded (264px) and rail (72px) states share the same items; the rail shows icons with tooltips.

## Rules
- Active item: soft blue fill, blue text, 3px indicator bar on the left edge, `aria-current="page"`.
- Count badges only for things that need action (new RFQs, unanswered quotations).
- Collapse animates width in 280ms on the shared curve; labels fade out first.
- Below 1024px the sidebar becomes a Sheet opened from a menu button.

**Build with:** shadcn `Sidebar`.. 


---

# Skeleton

Markup reference: `reference/components/Skeleton/preview.html`

Shimmering shapes that match the final layout, shown for loads over 300ms. Prevents layout shift.

## Variants
Line, title, block, circle. Compose to match the real card: media block, title, two lines, badge row.

## Rules
- The container has `aria-busy="true"`; skeleton shapes are `aria-hidden`.
- Match real dimensions so nothing jumps.
- Use for first load; use Spinner or an inline Progress for updates.
- Under reduced motion the shimmer stops.

**Build with:** shadcn `Skeleton`.. 


---

# Slider

Markup reference: `reference/components/Slider/preview.html`

Pick a number or a range. The value sits in a tooltip on the thumb while dragging or focused; the text inputs beside it are the accessible, precise way to type a value.

## Rules
- Thumb 20px with 6px focus halo; track 4px.
- Arrow keys step, PageUp/PageDown jump 10%, Home/End go to min/max.
- Always pair with numeric inputs for ranges.

**Build with:** Radix `Slider`.. 


---

# Spinner

Markup reference: `reference/components/Spinner/preview.html`

A rotating ring for short, unknown waits: button submit, inline refresh.

## Rules
- Always has `role="status"` and a text alternative (`aria-label` or visible text).
- Inherits `currentColor`.
- Under reduced motion it pulses instead of rotating.
- Waits over 10 seconds need a Progress bar with text.

**Build with:** Custom; used inside shadcn `Button`.. 


---

# Statistic

Markup reference: `reference/components/Statistic/preview.html`

Large mono numeral, label above, optional change with an arrow and text (never colour alone).

## Rules
Numbers in Inter 700, lining figures. Delta shows an arrow icon and a signed value ("+12%").

**Build with:** Custom.. 


---

# Stepper

Markup reference: `reference/components/Stepper/preview.html`

Shows where the user is in a linear flow (RFQ: Product → Quantity → Delivery → Documents → Review).

## Rules
Current step has `aria-current="step"`; completed steps show a check and are links; text always names the step, never numbers alone.

**Build with:** Custom ordered list.. 


---

# Switch

Markup reference: `reference/components/Switch/preview.html`

Settings that take effect at once (notifications, public profile). Use Checkbox when the change needs a Save.

## Rules
Track 40×22, thumb moves 18px. State is also written in text next to it ("On"). `role="switch"` with `aria-checked`.

**Build with:** shadcn `Switch` (Radix Switch).. 


---

# Tabs

Markup reference: `reference/components/Tabs/preview.html`

Views of the same object: Overview, Documents, Reviews. Not for steps (use Stepper) and not for page navigation (use Navbar).

## Rules
Tabs list has `role="tablist"`; arrow keys move; the active tab has a 2px ink-bar (Ant Design line tabs) plus bolder text. Panels are `role="tabpanel"`.

**Build with:** shadcn `Tabs` (Radix Tabs).. 


---

# Tag

Markup reference: `reference/components/Tag/preview.html`

A 22px label for categories, HS codes, certifications. Optionally removable.

## Rules
- Use for classification (Rice, Halal, ISO 22000). Use Badge for status.
- Remove button is a real `button` with `aria-label="Remove tag X"`.
- Do not use colour to categorise; tags are neutral.

**Build with:** shadcn `Badge` with an inner close button.. 


---

# Textarea

Markup reference: `reference/components/Textarea/preview.html`

Longer text: RFQ requirements, quotation notes, messages.

## Rules
Same states as Input. Minimum 96px high, vertical resize only. Show a character counter when a limit exists ("120 / 500") and announce it politely.

**Build with:** shadcn `Textarea`.. 


---

# Timeline

Markup reference: `reference/components/Timeline/preview.html`

Shows the append-only history (`quotation_status_history`, `deal_status_history`, `verification_status_history`) and milestones (`production_start`, `inspection`, `shipment`, `customs_clearance`, `delivery`).

## States
Done (filled navy dot with check), current (ring and halo), upcoming (grey outline).

## Rules
- Newest first for history, chronological for milestones.
- Each entry: title, actor company, time in mono, optional note.
- Delayed milestones use a warning Badge beside the title.

**Build with:** Custom ordered list.. 


---

# Toast

Markup reference: `reference/components/Toast/preview.html`

Brief feedback after an action: saved, sent, failed. Appears bottom-right (top on mobile), stays 6 seconds, longer for errors with an action.

## Rules
- Icon disc plus bold title plus one line. Tone colours are on the icon disc and the text stays high-contrast.
- `role="status"` for success/info, `role="alert"` for errors.
- Pause on hover and focus. Never put the only path to an important action in a toast.
- Max 3 stacked.

**Build with:** shadcn `Sonner` or `Toast` (Radix Toast).. 


---

# Tooltip

Markup reference: `reference/components/Tooltip/preview.html`

Names an icon or explains a term. Max 2 lines. Never the only place important information lives, and never contains links or buttons.

## Rules
Appears on focus as well as hover, after 300ms; stays while hovered; Esc dismisses (WCAG 1.4.13). Text 12px white on `ink` (14.4:1).

**Build with:** shadcn `Tooltip` (Radix Tooltip).. 


---

# UserMenu

Markup reference: `reference/components/UserMenu/preview.html`

The top-right account control. Shows initials (or photo), opens a menu with identity, organisation, settings and sign out.

## Rules
- The trigger is a 40px avatar button with `aria-label="Account menu"`.
- Header block shows name, email and verification badge; destructive Sign out is last.
- Same overlay motion; menu aligns to the trigger right edge.

**Build with:** Radix `DropdownMenu` + shadcn `Avatar`.. 


---

# VerificationBadge

Markup reference: `reference/components/VerificationBadge/preview.html`

Shows which verification levels a company holds (`company_verification_levels`). Verification builds buyer confidence, so it appears on every exporter card, product page and quotation.

## Levels
`email`, `phone`, `business_registration`, `business_address`, `authorized_representative`, `documents_reviewed`, `independent_check`.

## Variants
- **Summary**: shield icon and "Verified" plus count, used on cards.
- **Level chip**: one level, with tooltip explaining what was checked and when it expires.
- **Expired / revoked**: neutral outline with a clock icon. Never hide a lapsed level silently.

## Rules
- The word "Verified" always accompanies the shield.
- Tooltip lists level, date granted, expiry.

**Build with:** Custom component on shadcn `Badge` and `Tooltip`.. 
