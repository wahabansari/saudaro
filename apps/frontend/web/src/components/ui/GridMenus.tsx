'use client';

import { Fragment, useState, type MouseEvent, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export type ColumnMenuProps = {
  /** Header text; also the menu heading. */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPinned: boolean;
  /** The reference column cannot be unpinned or hidden. */
  isLocked: boolean;
  onFilter: () => void;
  onPin: () => void;
  onHide: () => void;
  className?: string;
};

/** Header label that opens the column menu on right-click, long press or the context-menu key. */
export function ColumnMenu({
  label,
  open,
  onOpenChange,
  isPinned,
  isLocked,
  onFilter,
  onPin,
  onHide,
  className,
}: ColumnMenuProps) {
  const openFromContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    onOpenChange(true);
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenu.Trigger
        asChild
        onPointerDown={(event) => event.preventDefault()}
        onContextMenu={openFromContextMenu}
      >
        <span
          className={clsx('sa-th__label', 'data-[state=closed]:![animation:none]', className)}
          // The label is a plain span: a menu trigger's ARIA attributes are not allowed on it.
          aria-haspopup={undefined}
          aria-expanded={undefined}
          aria-controls={undefined}
        >
          {label}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="sa-menu z-dropdown"
          aria-label="Column menu"
          align="start"
          sideOffset={6}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenu.Label className="sa-menu__label" role="presentation">
            {label}
          </DropdownMenu.Label>
          <DropdownMenu.Item className="sa-menu__item" onSelect={onFilter}>
            <Icon name="filter" />
            Filter…
          </DropdownMenu.Item>
          <DropdownMenu.Item className="sa-menu__item" disabled={isLocked || isPinned} onSelect={onPin}>
            <Icon name="pushpin" />
            Pin to left
          </DropdownMenu.Item>
          <DropdownMenu.Item className="sa-menu__item" disabled={isLocked} onSelect={onHide}>
            <Icon name="eye-off" />
            Hide column
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export type ColumnPickerItem = { id: string; label: string; isVisible: boolean; isLocked: boolean };

export type ColumnPickerProps = {
  columns: ColumnPickerItem[];
  onToggle: (id: string, isVisible: boolean) => void;
  onReset: () => void;
};

/** Content of the column picker dialog: head, searchable checklist, Reset and the Done button. */
export function ColumnPickerPanel({
  columns,
  onToggle,
  onReset,
  done,
  countLabel,
}: ColumnPickerProps & { done: ReactNode; countLabel?: string }) {
  const [query, setQuery] = useState('');
  const shown = columns.filter((column) => column.label.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleCount = columns.filter((column) => column.isVisible).length;

  return (
    <>
      <div className="sa-fil__head">
        <strong>Columns</strong>
        <small>{countLabel ?? `${visibleCount} of ${columns.length}`}</small>
      </div>
      <div className="sa-fil__body">
        <div className="sa-search" style={{ width: '100%' }}>
          <Icon name="search" />
          <input
            type="search"
            placeholder="Find a column"
            aria-label="Find a column"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <ul className="sa-fil__list">
          {shown.map((column) => (
            <li key={column.id}>
              <label className="sa-check">
                <input
                  type="checkbox"
                  checked={column.isVisible}
                  disabled={column.isLocked}
                  onChange={(event) => onToggle(column.id, event.target.checked)}
                />
                <span className="sa-check__box">
                  <Icon name="check" />
                </span>
                {column.label}
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="sa-fil__foot">
        <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={onReset}>
          Reset
        </button>
        {done}
      </div>
    </>
  );
}

/** Toolbar button and the column picker it opens. */
export function ColumnPicker(props: ColumnPickerProps) {
  return (
    <Popover.Root>
      <Popover.Trigger className="sa-btn sa-btn--secondary sa-btn--sm data-[state=closed]:![animation:none]">
        <Icon name="columns" />
        Columns
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="sa-fil z-dropdown"
          aria-label="Columns"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          style={{ width: 260 }}
        >
          <ColumnPickerPanel
            {...props}
            done={<Popover.Close className="sa-btn sa-btn--sm">Done</Popover.Close>}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export type GridRowAction = {
  label: string;
  icon: IconName;
  onSelect: () => void;
  /** Destructive actions go last, after a separator. */
  isDanger?: boolean;
};

export type RowActionsMenuProps = {
  /** Names the row for assistive tech, e.g. its reference. */
  rowLabel: string;
  /** The first action is the default one. */
  actions: GridRowAction[];
};

function ActionItem({ action, trailing }: { action: GridRowAction; trailing?: ReactNode }) {
  return (
    <DropdownMenu.Item
      className={clsx('sa-menu__item', action.isDanger && 'sa-menu__item--danger')}
      onSelect={action.onSelect}
    >
      <Icon name={action.icon} />
      {action.label}
      {trailing}
    </DropdownMenu.Item>
  );
}

/** The `more` icon button of the actions column and its menu. */
export function RowActionsMenu({ rowLabel, actions }: RowActionsMenuProps) {
  const firstDangerIndex = actions.findIndex((action) => action.isDanger);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className="sa-iconbtn sa-iconbtn--sm data-[state=closed]:![animation:none]"
        aria-label={`Row actions for ${rowLabel}`}
      >
        <Icon name="more" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="sa-menu z-dropdown"
          aria-label="Row actions"
          align="end"
          sideOffset={6}
        >
          {actions.map((action, index) => (
            <Fragment key={action.label}>
              {index === firstDangerIndex && index > 0 ? (
                <DropdownMenu.Separator className="sa-menu__sep" />
              ) : null}
              <ActionItem
                action={action}
                trailing={
                  index === 0 ? (
                    <span className="sa-menu__end">
                      <kbd className="sa-kbd">↵</kbd>
                    </span>
                  ) : undefined
                }
              />
            </Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
