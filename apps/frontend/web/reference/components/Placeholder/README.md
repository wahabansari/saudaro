Fallback shapes for missing product photos, company logos and avatars. Never leave a broken image.

## Rules
- Product image: 4:3 `card-sunken` block with an image icon.
- Company logo: square avatar with two-letter initials on `action`.
- Avatar: circle with initials; person photos are circles, company logos are rounded squares (`sa-avatar--sq`).
- Always set meaningful `alt` text on real images; placeholders are `aria-hidden` when the name is nearby.

**Build with:** shadcn `Avatar` (Radix Avatar fallback).. 
