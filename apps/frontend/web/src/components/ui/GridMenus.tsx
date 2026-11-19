'use client';

import { useState, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';
import { Check, NO_ANIMATION, SearchField } from './GridParts';

export type ColumnMenuProps = {
  label: string;
  onFilter: () => void;
  onPin: () => void;
  onHide: () => void;
  children: ReactNode;
};

export function ColumnMenu({ label, onFilter, onPin, onHide, children }: ColumnMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="sa-menu z-dropdown"
          aria-label="Column menu"
          align="start"
          sideOffset={6}
        >
          <DropdownMenu.Label className="sa-menu__label">{label}</DropdownMenu.Label>
          <DropdownMenu.Item className="sa-menu__item" onSelect={onFilter}>
            <Icon name="filter" />
            Filter…
          </DropdownMenu.Item>
          <DropdownMenu.Item className="sa-menu__item" onSelect={onPin}>
            <Icon name="pushpin" />
            Pin to left
          </DropdownMenu.Item>
          <DropdownMenu.Item className="sa-menu__item" onSelect={onHide}>
            <Icon name="eye-off" />
            Hide column
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export type PickerColumn = { id: string; label: string; visible: boolean; locked?: boolean };

export type ColumnPickerProps = {
  columns: PickerColumn[];
  onToggle: (id: string) => void;
  onReset: () => void;
};

export function ColumnPicker({ columns, onToggle, onReset }: ColumnPickerProps) {
  const [query, setQuery] = useState('');
  const shown = columns.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={clsx('sa-btn sa-btn--secondary sa-btn--sm', NO_ANIMATION)}
          aria-haspopup="dialog"
        >
          <Icon name="columns" />
          Columns
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="sa-fil z-dropdown"
          aria-label="Columns"
          style={{ width: 260 }}
          align="end"
          sideOffset={6}
          collisionPadding={8}
        >
          <div className="sa-fil__head">
            <strong>Columns</strong>
            <small>
              {columns.filter((c) => c.visible).length} of {columns.length}
            </small>
          </div>
          <div className="sa-fil__body">
            <SearchField
              label="Find a column"
              placeholder="Find a column"
              clearLabel="Clear"
              value={query}
              onChange={setQuery}
            />
            <ul className="sa-fil__list">
              {shown.map((c) => (
                <li key={c.id}>
                  <Check checked={c.visible} disabled={c.locked} onChange={() => onToggle(c.id)}>
                    {c.label}
                  </Check>
                </li>
              ))}
            </ul>
          </div>
          <div className="sa-fil__foot">
            <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={onReset}>
              Reset
            </button>
            <Popover.Close asChild>
              <button type="button" className="sa-btn sa-btn--sm">
                Done
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export type RowAction = { label: string; icon: IconName; onSelect: () => void; danger?: boolean };

export function RowActionsMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={clsx('sa-iconbtn sa-iconbtn--sm', NO_ANIMATION)} aria-label={label}>
          <Icon name="more" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="sa-menu z-dropdown"
          aria-label="Row actions"
          align="end"
          sideOffset={6}
        >
          {actions.map((a, i) => (
            <div key={a.label}>
              {a.danger && <DropdownMenu.Separator className="sa-menu__sep" />}
              <DropdownMenu.Item
                className={clsx('sa-menu__item', a.danger && 'sa-menu__item--danger')}
                onSelect={a.onSelect}
              >
                <Icon name={a.icon} />
                {a.label}
                {i === 0 && (
                  <span className="sa-menu__end">
                    <kbd className="sa-kbd">↵</kbd>
                  </span>
                )}
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
