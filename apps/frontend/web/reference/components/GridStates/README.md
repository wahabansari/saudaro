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
