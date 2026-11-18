# Motion

Purpose: show cause and effect. Never decoration.

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | Hover, press, colour change |
| `--dur-base` | 200ms | Menus, switches, accordion, dialog entry |
| `--dur-slow` | 320ms | Sheets, progress, page-level change |
| `--ease-out` | cubic-bezier(.2,.7,.2,1) | Entering, most transitions |
| `--ease-in-out` | cubic-bezier(.4,0,.2,1) | Looping skeleton, indeterminate bar |

Defined in `components/bundle.css`.

## Patterns
- **Dialog**: fade 0→1 and rise 8px, 200ms. Scrim fades 200ms.
- **Sheet**: slide 24px plus fade, 320ms.
- **Menu / tooltip**: fade and 4px offset, 120ms to 200ms.
- **Toast**: slide in 16px from its edge, 200ms; leave 120ms.
- **Card hover**: lift 2px and shadow `sm`→`md`, 200ms.
- **Button press**: 1px down, 120ms.
- **Skeleton**: shimmer 1.4s loop. **Spinner**: 0.7s linear.
- **List changes**: new items fade and expand over 200ms; removed items collapse over 120ms.

## Rules
- Nothing over 400ms. No bounce, no parallax, no autoplay motion longer than 5 seconds.
- Animate `opacity` and `transform` only, so it stays smooth.
- **Reduced motion**: with `prefers-reduced-motion: reduce` all transitions become 0.01ms, shimmer and spin stop (spinner pulses instead), slides become fades. Already built into `bundle.css`.
- Motion never carries information alone.
- With Framer Motion use the same durations and easings.

## Overlay motion (every menu, select, popover, tooltip, dialog, sheet, toast)
One curve and one pair of durations for all of them, so every popup feels like the same product.

| | Duration | Curve | Change |
|---|---|---|---|
| Open | 200ms | `cubic-bezier(.16,1,.3,1)` (`--ease-pop`) | opacity 0 to 1, translateY(-6px) to 0, scale .97 to 1 |
| Close | 140ms | ease-in | opacity 1 to 0, translateY(-4px), scale .98 |
| Sheet | 260ms | `--ease-pop` | slides 24px from its edge with a fade |
| Toast | 200ms | `--ease-pop` | rises 12px with a fade |
| Scrim | 200ms | ease-out | fade only |

The transform origin is the trigger edge (`--pop-origin`). With Radix, `data-state="open|closed"` drives `sa-pop-in` and `sa-pop-out`; the `.sa-pop` wrapper (open on `:focus-within`) exists for documentation previews. Hover and press feedback on items uses `--dur-fast`. Reduced motion removes the transform and keeps a 1ms fade.

## Page transitions
`@view-transition { navigation: auto; }` plus named transitions (`root`, `sa-hero`, `sa-head`). See the PageTransition component. The branded PageLoader appears only after a 300ms delay and stays at least 400ms.
