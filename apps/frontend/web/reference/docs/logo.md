# Logo guidelines

## The mark
A **cargo box** (a solid rounded square) with two arrows cut through it. The top arrow points right and exits through the right wall: goods out (export). The bottom arrow points left and enters through the left wall: goods in (import). The walls are open where the arrows pass, so the box reads as a gateway for trade, not as a generic swap icon. 64-unit grid, 58-unit square, 15-unit corner radius, 7-unit arrow shafts.

## Files (`assets/Logo`)
Every file comes in **blue** (`#2F6AD0`, wordmark in ink `#1A2B3C`), **white** and **ink** (`#1A2B3C`, for one-colour print and fax-grade documents).

| File | Use |
|---|---|
| `saudaro-lockup-horizontal-*.svg` | Default logo: header, documents, email signatures. |
| `saudaro-lockup-stacked-*.svg` | Square spaces: social profile, splash, print cover. |
| `saudaro-mark-*.svg` | Mark alone where the name appears nearby, or under 112px wide. |
| `saudaro-wordmark-*.svg` | Name alone, when the mark is already present. |
| `saudaro-app-icon.svg` | App icon and social avatar: white mark on `primary-900`, 14/64 corner radius. |
| `saudaro-favicon.svg` | Browser tab, 32px. |

The wordmark is **Saudaro** in Inter at weight 650 and optical size 32, mixed case, tracking -0.01em, converted to outlines so it renders without the font. Friendly and clear, in the same family as the rest of the site.

## Colour
- Navy on white and light greys (`grey-25` to `grey-200`): 7.8:1.
- White on navy, ink or dark photos.
- Ink only for one-colour contexts (stamps, B/W print).
- One colour at a time. No gradients, outlines, shadows or two-tone versions.

## Clear space
Keep clear on all sides the width of the stroke of the S (about 14% of the mark height). Nothing enters this area.

## Minimum size
| Version | Minimum |
|---|---|
| Horizontal lockup | 120px wide / 32mm |
| Stacked lockup | 72px wide / 20mm |
| Mark | 16px / 5mm |
| Wordmark | 88px wide / 24mm |

## Do
- Use the supplied SVG files, scaled proportionally.
- Place on white, `grey-25` to `grey-200`, `primary-900` and `primary-950`.
- Use the horizontal lockup at 32 to 40px high in the header.

## Don't
- Stretch, rotate, recolour, outline or add effects.
- Close the gap in the S or retype the wordmark in another font.
- Place the navy logo on mid-tone or busy photos.
- Put the white logo on light greys.
- Use the mark as a UI icon.
- Animate the logo other than a fade.


## Proportions (v2)
- The mark is cropped tight to its box, so every file has the same zero padding; use clear space in layout, not in the file.
- Horizontal lockup: mark height 1, wordmark cap height 0.46, gap 0.28. Stacked: mark 1, wordmark cap height 0.36, gap 0.24.
- App icon and favicon: the mark fills 58% (icon) and 61% (favicon) of the tile, optically centred.
