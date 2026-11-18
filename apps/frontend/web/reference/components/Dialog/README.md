Blocks the page for a decision: confirm, withdraw, accept quotation.

## Anatomy
Title, one-sentence body, actions right-aligned (cancel left of confirm). Destructive confirmations use the Destructive button and name the object.

## Rules
- Focus moves into the dialog, is trapped, and returns to the trigger on close (Radix does this).
- `Esc` closes; scrim click closes unless there are unsaved changes.
- Max width 480px; long forms use a Sheet.
- Entry: fade and 8px rise over 200ms; reduced motion: fade only.

**Build with:** shadcn `Dialog` / `AlertDialog` (Radix Dialog).. 
