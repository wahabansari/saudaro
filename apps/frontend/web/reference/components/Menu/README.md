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
