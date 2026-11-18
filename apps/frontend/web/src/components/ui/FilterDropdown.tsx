'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';
import { Icon } from '@/icons';
import { DateBody, EnumBody, NumberBody, TextBody } from './FilterDropdown.bodies';
import type { GridFilterOption, GridFilterType, GridFilterValue } from './DataGrid.types';

export type FilterDropdownProps = {
  /** Column header text, used in the accessible names. */
  label: string;
  type: GridFilterType;
  /** The committed filter for this column, if any. */
  value?: GridFilterValue;
  /** Commits the filter; `undefined` clears this column only. */
  onApply: (value: GridFilterValue | undefined) => void;
  /** Enum options with optional counts. */
  options?: GridFilterOption[];
  /** Number range limits; without them the range has no slider. */
  bounds?: readonly [min: number, max: number];
  /** Placeholder and label of the enum search field; defaults to `Search <column>`. */
  searchLabel?: string;
  /** Text the enum search field starts with. */
  defaultQuery?: string;
  /** Portal target, for rendering the popover inside a wrapper. */
  container?: HTMLElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

const EMPTY: { [T in GridFilterType]: Extract<GridFilterValue, { type: T }> } = {
  text: { type: 'text', value: '' },
  enum: { type: 'enum', values: [] },
  number: { type: 'number' },
  date: { type: 'date' },
};

const TYPE_LABEL: Record<Exclude<GridFilterType, 'enum'>, string> = {
  text: 'Text',
  number: 'Range',
  date: 'Date range',
};

/** A draft with nothing set is the same as no filter. */
function normalize(draft: GridFilterValue): GridFilterValue | undefined {
  switch (draft.type) {
    case 'text':
      return draft.value.trim() === '' ? undefined : { ...draft, value: draft.value.trim() };
    case 'enum':
      return draft.values.length === 0 ? undefined : draft;
    case 'number':
      return draft.min === undefined && draft.max === undefined ? undefined : draft;
    case 'date':
      return !draft.from && !draft.to ? undefined : draft;
  }
}

type PanelProps = Pick<
  FilterDropdownProps,
  'label' | 'type' | 'value' | 'onApply' | 'options' | 'bounds' | 'searchLabel' | 'defaultQuery'
> & {
  onClose: () => void;
};

/** Content of the filter dialog: head, typed body and Clear / Apply. */
export function FilterPanel({
  label,
  type,
  value,
  onApply,
  options = [],
  bounds,
  searchLabel = `Search ${label}`,
  defaultQuery,
  onClose,
}: PanelProps) {
  const [draft, setDraft] = useState<GridFilterValue>(value ?? EMPTY[type]);
  const commit = (next: GridFilterValue | undefined) => {
    onApply(next);
    onClose();
  };

  return (
    <>
      <div className="sa-fil__head">
        <strong>{label}</strong>
        <small>{draft.type === 'enum' ? `${draft.values.length} selected` : TYPE_LABEL[draft.type]}</small>
      </div>
      <div className="sa-fil__body">
        {draft.type === 'text' && <TextBody draft={draft} onChange={setDraft} />}
        {draft.type === 'enum' && (
          <EnumBody
            draft={draft}
            onChange={setDraft}
            options={options}
            searchLabel={searchLabel}
            defaultQuery={defaultQuery}
          />
        )}
        {draft.type === 'number' && (
          <NumberBody draft={draft} onChange={setDraft} bounds={bounds} label={label} />
        )}
        {draft.type === 'date' && <DateBody draft={draft} onChange={setDraft} />}
      </div>
      <div className="sa-fil__foot">
        <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={() => commit(undefined)}>
          Clear
        </button>
        <button type="button" className="sa-btn sa-btn--sm" onClick={() => commit(normalize(draft))}>
          Apply
        </button>
      </div>
    </>
  );
}

/** The filter button of a column header and the popover it opens. */
export function FilterDropdown({
  label,
  value,
  open,
  onOpenChange,
  className,
  container,
  ...panel
}: FilterDropdownProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;

  return (
    <Popover.Root open={isOpen} onOpenChange={setOpen}>
      <Popover.Trigger
        className={clsx(
          'sa-th__btn',
          value && 'is-active',
          'data-[state=closed]:![animation:none]',
          className,
        )}
        aria-label={`Filter ${label}`}
      >
        <Icon name="filter" />
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Content
          className="sa-fil z-dropdown"
          aria-label={`Filter ${label}`}
          align="end"
          sideOffset={6}
          collisionPadding={8}
        >
          <FilterPanel label={label} value={value} onClose={() => setOpen(false)} {...panel} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
