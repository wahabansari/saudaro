Shimmering shapes that match the final layout, shown for loads over 300ms. Prevents layout shift.

## Variants
Line, title, block, circle. Compose to match the real card: media block, title, two lines, badge row.

## Rules
- The container has `aria-busy="true"`; skeleton shapes are `aria-hidden`.
- Match real dimensions so nothing jumps.
- Use for first load; use Spinner or an inline Progress for updates.
- Under reduced motion the shimmer stops.

**Build with:** shadcn `Skeleton`.. 
