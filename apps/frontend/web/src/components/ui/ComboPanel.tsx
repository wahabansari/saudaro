'use client';

import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '@/icons';

export type ComboOption = { value: string; label: string; flag?: string; count?: number };

type Props = {
  options: ComboOption[];
  selected: string[];
  onPick: (value: string) => void;
  searchLabel: string;
  multiple?: boolean;
  onEmptyBackspace?: () => void;
  children?: ReactNode;
};

function Mark({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query) : -1;
  if (i < 0) return text;
  const end = i + query.length;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, end)}</mark>
      {text.slice(end)}
    </>
  );
}

export function ComboPanel({
  options,
  selected,
  onPick,
  searchLabel,
  multiple,
  onEmptyBackspace,
  children,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const q = query.trim().toLowerCase();
  const shown = options.filter((o) => o.label.toLowerCase().includes(q));
  const activeId = shown[active] ? `${id}-${active}` : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !query) onEmptyBackspace?.();
    if (!shown.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = shown[active];
      if (option) onPick(option.value);
    }
  }

  return (
    <>
      <div className="sa-combo__search">
        <Icon name="search" size={20} />
        <input
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          placeholder={searchLabel}
          aria-label={searchLabel}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      <ul
        id={`${id}-list`}
        className="sa-combo__list"
        role="listbox"
        aria-multiselectable={multiple || undefined}
      >
        {shown.map((o, i) => {
          const isSelected = selected.includes(o.value);
          return (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              className="sa-opt"
              aria-selected={isSelected}
              data-active={i === active || undefined}
              onMouseMove={() => setActive(i)}
              onClick={() => onPick(o.value)}
            >
              {multiple && (
                <span className="sa-check" aria-hidden="true">
                  <span
                    className={
                      isSelected
                        ? 'sa-check__box !border-action !bg-action !text-white [&>svg]:!scale-100 [&>svg]:!opacity-100'
                        : 'sa-check__box'
                    }
                  >
                    <Icon name="check" size={12} />
                  </span>
                </span>
              )}
              {o.flag && <span className="sa-opt__flag">{o.flag}</span>}
              <Mark text={o.label} query={q} />
              {!multiple && isSelected && <Icon name="check" size={16} />}
              {o.count !== undefined && <small>{o.count}</small>}
            </li>
          );
        })}
        {!shown.length && (
          <li className="sa-combo__empty" role="presentation">
            No match for “{query}”
          </li>
        )}
      </ul>
      {children}
    </>
  );
}
