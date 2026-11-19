'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@/icons';
import { Highlight } from './Highlight';

export type ComboOption = { value: string; label: string; flag?: string; count?: number };

type Props = {
  options: ComboOption[];
  selected: string[];
  multiple?: boolean;
  placeholder: string;
  emptyLabel: string;
  listId: string;
  onPick: (value: string) => void;
  onBackspaceEmpty?: () => void;
  container?: HTMLElement;
  children?: ReactNode;
};

const PANEL =
  'sa-combo__panel z-dropdown w-[var(--radix-popover-trigger-width)] [transform-origin:var(--radix-popover-content-transform-origin)] [animation:sa-pop-in_var(--dur-in)_var(--ease-pop)_both] motion-reduce:[animation:none]';
const ITEM_IN = '[animation:sa-item-in_340ms_var(--ease-pop)_both]';

export function ComboPanel({
  options,
  selected,
  multiple,
  placeholder,
  emptyLabel,
  listId,
  onPick,
  onBackspaceEmpty,
  container,
  children,
}: Props) {
  const [query, setQuery] = useState('');
  const noActive = multiple ? -1 : 0;
  const [active, setActive] = useState(noActive);
  const listRef = useRef<HTMLUListElement>(null);
  const needle = query.trim().toLowerCase();
  const visible = options.filter((option) => option.label.toLowerCase().includes(needle));

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !query) return onBackspaceEmpty?.();
    if (!visible.length) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (visible[active]) onPick(visible[active].value);
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    setActive((index) =>
      index < 0 ? (step > 0 ? 0 : visible.length - 1) : (index + step + visible.length) % visible.length,
    );
  }

  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        className={PANEL}
        sideOffset={6}
        align="start"
        onOpenAutoFocus={container ? (event) => event.preventDefault() : undefined}
      >
        <div className="sa-combo__search">
          <Icon name="search" size={20} />
          <input
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={active >= 0 && visible.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder={placeholder}
            aria-label={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(noActive);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <ul
          ref={listRef}
          id={listId}
          className="sa-combo__list"
          role="listbox"
          aria-multiselectable={multiple || undefined}
        >
          {visible.map((option, index) => {
            const isSelected = selected.includes(option.value);
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                className={`sa-opt ${ITEM_IN}`}
                role="option"
                aria-selected={isSelected}
                data-active={index === active ? '' : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(option.value)}
              >
                {multiple ? (
                  <span className="sa-check pointer-events-none" aria-hidden="true">
                    <input type="checkbox" checked={isSelected} readOnly tabIndex={-1} />
                    <span className="sa-check__box">
                      <Icon name="check" size={20} />
                    </span>
                  </span>
                ) : null}
                {option.flag ? <span className="sa-opt__flag">{option.flag}</span> : null}
                <Highlight text={option.label} query={query} />
                {option.count === undefined ? null : <small>{option.count}</small>}
                {!multiple && isSelected ? <Icon name="check" size={20} /> : null}
              </li>
            );
          })}
        </ul>
        {visible.length ? null : <div className="sa-combo__empty">{`${emptyLabel} "${query}"`}</div>}
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
