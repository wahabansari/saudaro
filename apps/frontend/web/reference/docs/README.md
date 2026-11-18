# SAUDARO

**Trade with proof.** SAUDARO is a public marketplace where importers post RFQs and quotations, and exporters show their products together with every sample document, so buyers can find the paperwork, compare and negotiate in one place.

This is the brand and design system: logo, colour, type (Inter), duotone icons, 63 components and accessibility rules. **No page layouts are designed here yet.**

## References
Component anatomy follows **Ant Design** (button types primary / default / dashed / text / link, 32 / 40 / 48 control heights, 8px control radius, 22px tags, table and tab patterns, 4px size unit) polished with **Untitled UI** details (1px bordered controls, soft shadow-xs, subtle inset edge on filled buttons, soft halo around focused inputs, bordered badges). Primitives come from shadcn/ui on Radix. Everything is re-coloured and re-measured for the SAUDARO palette and WCAG 2.2 AA.

## The 60 / 30 / 10 rule
| Share | Colour | Where it lives |
|---|---|---|
| **60%** | White and near-white (`white`, `grey-25`) with the blue accent | Page and card surfaces; primary buttons, links, active and selected states, the logo carry the blue |
| **30%** | Cool light grey (`grey-50` to `grey-300`) | Header, footer, sunken areas, borders, secondary text |
| **10%** | Mid blue (`primary-700` `#2F6AD0`) and deep navy (`primary-900`) | Actions, selection badges, icons tints; navy only in hero bands |

**Ink `#1A2B3C` is the black.** All dark text, icons, tooltips, shadows and scrims use it. There is no `#000` anywhere.

Two themes share one ratio:
- **Light** (default): white cards on a near-white page; header and footer are light grey.
- **Navy hero band**: public landing sections only. Wrap in `sa-ground`; use inverse buttons.

Status colours (success, warning, danger) are **functional exceptions** outside the ratio. They appear only in badges, alerts, toasts and validation, with an icon and text.

## Principles
1. One primary action per region. On a navy hero band use the **inverse** (white) button; on white or grey use the **primary** (blue) button.
2. Colour never carries meaning alone: every status has an icon and words.
3. Documents beside products: a document count on every product and exporter card.
4. Inter for everything: variable weight and optical size, with tabular figures and slashed zero for data (references, prices, HS codes, Incoterms).
5. Controls are 40px on desktop and 44px on touch; focus is always visible.

## Where to look
| Need | Read |
|---|---|
| Logo files and rules | Logo guidelines |
| Colours, ink, contrast table | Colour |
| Inter, OpenType features, type scale | Typography |
| Spacing, radius, elevation, grid | Layout |
| Motion | Motion |
| Icons | Iconography |
| Contrast, focus, keyboard, touch | Accessibility |
| Tone and microcopy | Content voice |
| Every component with live preview | Components |

## Stack
React + Tailwind + **shadcn/ui** on **Radix**. `tokens.json` becomes CSS variables (`tokens.css`) and the Tailwind theme. Font: **Inter**, complete variable font (wght 100 to 900, opsz 14 to 32, upright and italic) in `fonts/`, SIL OFL licence included.


## Start here
Building the UI? Read [handoff.md](handoff.md) first: stack, tokens, behaviour rules, component inventory and build order.
