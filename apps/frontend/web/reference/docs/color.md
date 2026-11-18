# Colour

## System
A clear mid blue (action fill 5.1:1 with white text; the deep navy appears only in hero bands), a cool grey that shares the ink's blue-grey hue, **ink `#1A2B3C` as black**, white. Status colours only for state. Scales follow Ant Design's ten-step approach, with soft (50/100/200) tints for fills and borders as in Untitled UI.

### Primary: navy (60%)
`primary-50` #F3F7FE · `100` #E3EDFC · `200` #C3D8F8 · `300` #9BBCF2 · `400` #6C9BE8 · `500` #4F86E3 · `600` #3A76D8 · **`700` #2F6AD0 (brand, action)** · `800` #2859B3 · `900` #1F4C9E (hero bands only) · `950` #183F87

Ant-style roles: soft fill `primary-50`, soft border `primary-200`, hover `600`, base `700`, active `800`.

### Grey (30%), lighter shades included
`grey-25` #FAFBFC · `50` #F4F6F8 · `100` #EDF0F3 · `200` #E1E6EB · `300` #CBD3DB · `400` #9DAAB8 · `450` #7B8A9A · `500` #5F6F80 · `600` #4E5F71 · `700` #3A4B5D · `800` #2B3D4F

### Ink and white
**`ink` #1A2B3C** is used for every piece of dark text and every icon on light surfaces, tooltip background, and shadow and scrim colour. **`white`** #FFFFFF is the 10%.

### Status (functional, outside the ratio)
Success `700` #14683F on `100` #E4F5EB, border `200` #B5E0C8 · Warning `800` #6F4800 on `100` #FFF3D6, border `200` #F2D48F · Danger `700` #B0231A on `100` #FDEAE8, border `200` #F3B9B3 · Info reuses `primary-700` on `primary-50`. On navy surfaces use the `300` values.

## Semantic roles
Use these in code, never raw hex.

| Role | Tokens |
|---|---|
| Ground | `ground`, `ground-text`, `ground-muted`, `ground-border` |
| Chrome | `chrome`, `chrome-text`, `chrome-muted` |
| Card | `card`, `card-sunken`, `card-text`, `card-muted`, `card-border` |
| Controls | `control-border`, `control-border-soft`, `action`, `action-hover`, `action-active`, `action-text`, `action-soft`, `action-soft-border`, `action-inverse`, `action-inverse-hover`, `action-inverse-text` |
| Links and focus | `link`, `link-on-ground`, `focus-on-ground`, `focus-on-card`, `focus-halo` |
| State | `selected`, `success-*`, `warning-*`, `danger-*`, `info-*` (text, bg, border), `overlay` |

## Rules
1. Text on ground uses `ground-*`; text on card uses `card-*`. Never mix.
2. Primary buttons are blue on white and grey; only on a navy hero band use **inverse** (white).
3. `ink` replaces black everywhere; never `#000`, never pure grey text.
4. `grey-400` and lighter are not for text on white. `grey-450` is for control borders only; `grey-500` (5.2:1) is the lightest text colour on white.
5. Hairlines (`card-border`, `grey-200`) are decorative; input, checkbox and radio edges use `control-border` (3.5:1).
6. No fourth hue. Status without an icon and text is a bug.

## Contrast (WCAG 2.2, computed)
All text pairs meet **AA (4.5:1)**; most meet AAA. Controls and focus rings meet 3:1.

| Pair | Foreground | Background | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Navy hero band: body text | `white` #FFFFFF | `primary-900` #1F4C9E | **8.1:1** | 4.5:1 | AAA |
| Navy hero band: muted text | `primary-200` #C3D8F8 | `primary-900` #1F4C9E | **5.6:1** | 4.5:1 | AA |
| Navy hero band: links, focus ring | `primary-200` #C3D8F8 | `primary-900` #1F4C9E | **5.6:1** | 4.5:1 | AA |
| Header and footer (light grey): text | `ink` #1A2B3C | `grey-100` #F2F5F8 | **13.2:1** | 4.5:1 | AAA |
| Header and footer: muted text | `grey-600` #4E5F71 | `grey-100` #F2F5F8 | **6.0:1** | 4.5:1 | AA |
| Card: body text | `ink` #1A2B3C | `white` #FFFFFF | **14.4:1** | 4.5:1 | AAA |
| Card: muted text | `grey-600` #4E5F71 | `white` #FFFFFF | **6.6:1** | 4.5:1 | AA |
| Placeholder text on white | `grey-500` #5F6F80 | `white` #FFFFFF | **5.2:1** | 4.5:1 | AA |
| Links on white | `primary-700` #2F6AD0 | `white` #FFFFFF | **5.1:1** | 4.5:1 | AA |
| Page ground: body text | `ink` #1A2B3C | `grey-25` #FCFDFE | **14.2:1** | 4.5:1 | AAA |
| Page ground: muted text | `grey-600` #4E5F71 | `grey-25` #FCFDFE | **6.4:1** | 4.5:1 | AA |
| Sunken areas: muted text | `grey-600` #4E5F71 | `grey-50` #F8FAFB | **6.3:1** | 4.5:1 | AA |
| Primary button label | `white` #FFFFFF | `primary-700` #2F6AD0 | **5.1:1** | 4.5:1 | AA |
| Primary button pressed label | `white` #FFFFFF | `primary-800` #2859B3 | **6.6:1** | 4.5:1 | AA |
| Inverse button label | `ink` #1A2B3C | `white` #FFFFFF | **14.4:1** | 4.5:1 | AAA |
| Danger button label | `white` #FFFFFF | `danger-700` #B0231A | **6.8:1** | 4.5:1 | AA |
| Tooltip text | `white` #FFFFFF | `ink` #1A2B3C | **14.4:1** | 4.5:1 | AAA |
| Selected checkbox / radio badge text | `primary-800` #2859B3 | `primary-50` #F3F7FE | **6.2:1** | 4.5:1 | AA |
| Success badge | `success-700` #14683F | `success-100` #E4F5EB | **6.0:1** | 4.5:1 | AA |
| Warning badge | `warning-800` #6F4800 | `warning-100` #FFF3D6 | **7.3:1** | 4.5:1 | AAA |
| Danger badge | `danger-700` #B0231A | `danger-100` #FDEAE8 | **5.8:1** | 4.5:1 | AA |
| Info badge | `primary-800` #2859B3 | `primary-50` #F3F7FE | **6.2:1** | 4.5:1 | AA |
| Neutral badge | `grey-800` #2B3D4F | `grey-100` #F2F5F8 | **10.2:1** | 4.5:1 | AAA |
| Success on navy ground | `success-300` #8AD9B1 | `primary-900` #1F4C9E | **4.9:1** | 4.5:1 | AA |
| Warning on navy ground | `warning-300` #F2C55C | `primary-900` #1F4C9E | **5.0:1** | 4.5:1 | AA |
| Danger on navy ground | `danger-300` #FBB9B3 | `primary-900` #1F4C9E | **4.9:1** | 4.5:1 | AA |
| Input, checkbox, radio border | `grey-450` #7B8A9A | `white` #FFFFFF | **3.5:1** | 3:1 | AA (UI) |
| Focus ring on white | `primary-700` #2F6AD0 | `white` #FFFFFF | **5.1:1** | 3:1 | AA (UI) |
| Focus ring on grey | `primary-700` #2F6AD0 | `grey-100` #F2F5F8 | **4.7:1** | 3:1 | AA (UI) |
| Focus ring on navy ground | `primary-200` #C3D8F8 | `primary-900` #1F4C9E | **5.6:1** | 3:1 | AA (UI) |
