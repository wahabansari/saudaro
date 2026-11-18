Use instead of Select when the list has more than 8 options. The trigger looks like an input; the panel has a search field and a scrollable listbox (max 224px).

## Behaviour
- Typing filters instantly; matches are highlighted; no match shows an empty message with the typed text.
- Arrow keys move the active option, Enter selects and closes, Esc closes.
- Selected option shows a check and soft blue fill. The trigger shows the value or the placeholder.
- Async lists show a Spinner row and keep the typed text.

## Accessibility
ARIA 1.2 combobox pattern: input `role="combobox"` `aria-expanded` `aria-controls` `aria-activedescendant`; options `role="option"` `aria-selected`.

**Build with:** shadcn `Combobox` (Popover + Command).. Debounce server search 250ms.
