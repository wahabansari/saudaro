Input with a calendar icon opens a month grid. Range mode fills the days between start and end with a soft blue band and square caps.

## States
Today (blue ring), selected start/end (solid blue), in range (soft blue), outside month (grey 5.2:1), disabled (struck through, not selectable).

## Rules
- The input also accepts typing (`DD MMM YYYY`); the calendar is an aid.
- Day cells are 40px (44px on touch). Arrow keys move by day, PageUp/PageDown by month.
- Past dates are disabled for deadlines; the reason shows in the helper text.

**Build with:** shadcn `Calendar` (react-day-picker) in a Popover.. 
