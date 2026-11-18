Brief feedback after an action: saved, sent, failed. Appears bottom-right (top on mobile), stays 6 seconds, longer for errors with an action.

## Rules
- Icon disc plus bold title plus one line. Tone colours are on the icon disc and the text stays high-contrast.
- `role="status"` for success/info, `role="alert"` for errors.
- Pause on hover and focus. Never put the only path to an important action in a toast.
- Max 3 stacked.

**Build with:** shadcn `Sonner` or `Toast` (Radix Toast).. 
