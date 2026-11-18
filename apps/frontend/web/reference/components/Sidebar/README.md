Primary navigation for the signed-in workspace. Expanded (264px) and rail (72px) states share the same items; the rail shows icons with tooltips.

## Rules
- Active item: soft blue fill, blue text, 3px indicator bar on the left edge, `aria-current="page"`.
- Count badges only for things that need action (new RFQs, unanswered quotations).
- Collapse animates width in 280ms on the shared curve; labels fade out first.
- Below 1024px the sidebar becomes a Sheet opened from a menu button.

**Build with:** shadcn `Sidebar`.. 
