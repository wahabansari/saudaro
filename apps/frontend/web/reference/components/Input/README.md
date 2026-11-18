Text, number, email, search and phone entry.

## Anatomy
Label above (always visible), field, optional hint, error message. Required fields show a red asterisk and `aria-required`.

## States
Default, hover, focus (ring + action border), filled, invalid (2px danger border, icon and message), disabled, read-only.

## Rules
- Never use placeholder as a label. Placeholder is an example value (`grey-500` on white, 5.2:1).
- On touch the font becomes 16px to stop iOS zoom.
- Border is `grey-450` (3.5:1 against white, needs 3:1). Height 40px (32 small, 48 large; 44 on touch). Focus: 2px ring plus a 5px `focus-halo`.
- Errors say what to do: "Enter a quantity of 1 or more".
- Link errors with `aria-describedby`; set `aria-invalid="true"`.
- Numbers, prices and HS codes use `sa-mono`.

**Build with:** shadcn `Input` + `Label` + `FormMessage` (react-hook-form).. 
