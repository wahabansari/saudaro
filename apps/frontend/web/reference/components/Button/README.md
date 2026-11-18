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
