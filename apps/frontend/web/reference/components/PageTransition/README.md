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
