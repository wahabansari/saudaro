'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useId, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { Icon } from '@/icons';
import { ComboPanel, type ComboOption } from './ComboPanel';

export type MultiSelectOption = ComboOption;

export type MultiSelectProps = Omit<ComponentProps<'div'>, 'children'> & {
  options: MultiSelectOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel?: string;
  open?: boolean;
  container?: HTMLElement;
};

const MAX_TAGS = 3;

export function MultiSelect({
  options,
  values,
  onValuesChange,
  placeholder,
  searchPlaceholder,
  emptyLabel = 'No results for',
  open: openProp,
  container,
  className,
  ...props
}: MultiSelectProps) {
  const [openState, setOpen] = useState(false);
  const open = openProp ?? openState;
  const listId = useId();
  const chosen = values.flatMap((value) => options.find((option) => option.value === value) ?? []);

  function toggle(value: string) {
    onValuesChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    setOpen((current) => !current);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={clsx('sa-combo', className)} data-open={open ? '' : undefined}>
        <PopoverPrimitive.Trigger asChild>
          <div
            role="combobox"
            tabIndex={0}
            aria-haspopup="listbox"
            {...props}
            className="sa-combo__trigger data-[state=closed]:![animation:none]"
            onKeyDown={handleTriggerKeyDown}
          >
            {chosen.length ? (
              <span className="sa-combo__tags">
                {chosen.slice(0, MAX_TAGS).map((option) => (
                  <span key={option.value} className="sa-tag">
                    {option.label}
                    <button
                      type="button"
                      aria-label={`Remove ${option.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggle(option.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Delete') return;
                        event.preventDefault();
                        toggle(option.value);
                      }}
                    >
                      <Icon name="x" size={20} />
                    </button>
                  </span>
                ))}
                {chosen.length > MAX_TAGS ? (
                  <span className="sa-tag">{`+${chosen.length - MAX_TAGS}`}</span>
                ) : null}
              </span>
            ) : (
              <span className="sa-combo__ph">{placeholder}</span>
            )}
            <Icon name="chevron-down" size={20} />
          </div>
        </PopoverPrimitive.Trigger>
      </div>
      <ComboPanel
        container={container}
        options={options}
        selected={values}
        multiple
        placeholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        listId={listId}
        onPick={toggle}
        onBackspaceEmpty={() => onValuesChange(values.slice(0, -1))}
      >
        <div className="sa-combo__foot">
          <span>{`${values.length} selected`}</span>
          <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={() => onValuesChange([])}>
            Clear
          </button>
        </div>
      </ComboPanel>
    </PopoverPrimitive.Root>
  );
}
