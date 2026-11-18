An icon-only control: close, more, favourite, copy. Always has `aria-label`, and a Tooltip when the meaning is not obvious.

## Variants
Ghost (default `sa-iconbtn`), outline (`sa-iconbtn--outline`), filled (`sa-iconbtn--filled`), small (`sa-iconbtn--sm`, 32px, desktop only). Default 40px (44px on touch); also an outline variant.

## Rules
- `aria-label` is required; the icon is `aria-hidden`.
- Toggle icon buttons use `aria-pressed`.
- Do not use for primary actions that need a label.

**Build with:** shadcn `Button size="icon"`.. 
