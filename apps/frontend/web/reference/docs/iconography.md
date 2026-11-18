# Iconography

- **Set:** Phosphor **Duotone** (MIT licence). 256-unit grid, 16px stroke at 256 which is 1.5px at 24px, rounded joins, a solid outline plus a 30% tint of the same colour behind it. `fill: currentColor`, so one colour token drives both tones.
- **Sizes (each is a deliberate step):** 16 inline text and badges · 20 buttons, inputs, menus · 24 list rows, tiles, document icons · 32 stat and empty-state accents · 48 media placeholders and hero features. Never scale between steps.
- **Colour:** inherits text colour. On light surfaces icons are `ink`, `grey-600` for quiet or `action` for emphasis; on navy they are white. The tint layer never carries meaning.
- **Contrast:** the outline is the information, so it meets 3:1 against its surface (all listed colours do). The 30% tint is decoration.
- **Decorative** icons are `aria-hidden="true"` and `focusable="false"`. Icon-only buttons get `aria-label` (and a Tooltip where the meaning is not obvious). The hit area is 40px (44px on touch) even when the icon is 20px.
- **Do not** mix duotone with other families, add emoji, or colour the tint layer differently from the outline.

## Core set for the marketplace
magnifying-glass (search), funnel (filter), package (product), file-text (document), certificate, receipt (invoice), file-pdf, upload-simple, download-simple, eye (preview), shield-check and seal-check (verification), lock (restricted), boat (shipping), globe, buildings and factory (company), storefront, chat-circle (negotiation), paper-plane-tilt (send), clock (deadline, expiry), check-circle, warning-circle, warning, info, plus, x, caret-down, arrow-right, star, pencil-simple, copy, trash, dots-three, envelope, user, map-pin, calendar-blank, handshake, heart.

## Status icon mapping
Neutral: circle · Info: info · Success: check-circle · Warning: warning · Danger: warning-circle · Expired and pending: clock · Restricted: lock · Verified: seal-check.

## Document type icons
Certificates use `certificate`, invoices `receipt`, others `file-text`, photos `image`, restricted `lock`. The document type is also written in text, never icon alone.

## Do not
Use emoji as icons, flags as icons for language, or illustrations for empty states. A tinted icon disc is the empty-state graphic.
