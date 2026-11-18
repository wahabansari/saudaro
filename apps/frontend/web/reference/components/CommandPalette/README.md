A dialog with a search field and grouped results. Opens with <kbd>Ctrl</kbd> + <kbd>K</kbd> (<kbd>⌘</kbd> + <kbd>K</kbd> on Mac) from anywhere.

## Behaviour
- Results group as Go to, Create, Recent; typing filters across groups and highlights matches.
- ↑ ↓ move, ↵ runs, Esc closes. The footer always shows these hints.
- Opens with the dialog motion (scrim fades, panel rises 6px).

## Accessibility
`role="dialog"` with a combobox inside; results are options with `aria-selected`.

**Build with:** shadcn `Command` in `Dialog` (cmdk).. 
