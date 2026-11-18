A 3px bar fixed to the top of the viewport while the next route loads. Indeterminate by default; determinate for uploads.

## Rules
- Starts after 120ms; completes and fades in 200ms.
- Colour is `action`; the head glows to `primary-400`.
- Never blocks interaction. `role="progressbar"` with `aria-busy` on the main region.

**Build with:** NProgress-style hook on the Next.js router events.. 
