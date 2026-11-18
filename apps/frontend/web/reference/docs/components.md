# Components

Anatomy follows Ant Design and Untitled UI (see Overview). Every component has a live preview and a README with variants, states, rules and its shadcn/Radix mapping. All classes use the prefix `sa-` and live in `components/bundle.css`, driven by tokens.

## Inventory (63)
**Actions:** Button, IconButton, ButtonGroup
**Forms:** Input, Textarea, Select, Checkbox, Radio, Switch, FileUpload, Slider, NumberInput
**Feedback:** Badge, Toast, Alert
**Loaders:** Spinner, Skeleton, Progress
**Placeholders:** EmptyState, Placeholder
**Overlays:** Dialog, Sheet, Tooltip, Popover
**Menus & dropdowns:** Menu, Combobox, MultiSelect, DatePicker, CommandPalette, UserMenu
**Navigation:** Tabs, Breadcrumb, Pagination, Stepper, Navbar, Footer, Accordion
**Layout:** Sidebar, PageHeader, Banner
**Data display:** Card, Chip, Tag, Avatar, Divider, Timeline, Statistic, Rating
**Data grid:** DataGrid, FilterDropdown, GridMenus, GridStates
**Page loader:** PageLoader, RouteProgress, PageTransition
**Marketplace:** ProductCard, ExporterCard, DocumentTile, RfqCard, QuotationCard, NegotiationThread, VerificationBadge

## State matrix (all interactive components)
Default · Hover · Active · Focus-visible · Disabled · Loading (where async) · Invalid (inputs) · Selected (tabs, chips, rows).

## Choosing between similar components
| Need | Use |
|---|---|
| Blocking decision | Dialog |
| Filters, preview, long form | Sheet |
| Page feedback after action | Toast |
| Message tied to content | Alert |
| Status of an object | Badge |
| Filter toggle | Chip |
| 2 to 5 exclusive options visible | Radio |
| 5+ options | Select / Combobox |
| Immediate on/off | Switch |
| On/off needing Save | Checkbox |
| Wait under 10s | Spinner |
| Wait over 10s or measurable | Progress |
| First load of content | Skeleton |

## Marketplace status mapping
RFQ, quotation, deal and verification statuses map to Badge tones in the Badge README using the exact enums from the API docs.

## Naming and API
`Button` = `sa-btn` + variant modifier. Modifiers use `--` (`sa-btn--outline`). Parts use `__` (`sa-card__body`). State uses ARIA attributes (`aria-pressed`, `aria-busy`, `aria-selected`, `aria-invalid`, `aria-disabled`), not extra classes.

## Tables
There is no simple table. Every list of records is a **DataGrid** (even 3 rows): header filters on the right of each header cell, nowrap cells, horizontal scroll with sticky reference, checkbox and actions columns.


## Showcase frame
Every component, card and table is shown the same way: a white frame with 3px padding, the name on top with one line of text under it, and a body in `grey-300` holding the component directly. Components never sit in another white card inside that body.
