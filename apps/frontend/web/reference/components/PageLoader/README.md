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
