'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useId, useState, type ComponentProps } from 'react';
import { Icon } from '@/icons';
import { ComboPanel, type ComboOption } from './ComboPanel';

export type ComboboxOption = ComboOption;

export type ComboboxProps = Omit<ComponentProps<'button'>, 'value' | 'children'> & {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel?: string;
  open?: boolean;
  container?: HTMLElement;
};

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyLabel = 'No results for',
  open: openProp,
  container,
  className,
  ...props
}: ComboboxProps) {
  const [openState, setOpen] = useState(false);
  const open = openProp ?? openState;
  const listId = useId();
  const current = options.find((option) => option.value === value);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={clsx('sa-combo', className)} data-open={open ? '' : undefined}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            {...props}
            className="sa-combo__trigger data-[state=closed]:![animation:none]"
          >
            <span className={current ? undefined : 'sa-combo__ph'}>{current?.label ?? placeholder}</span>
            <Icon name="chevron-down" size={20} />
          </button>
        </PopoverPrimitive.Trigger>
      </div>
      <ComboPanel
        container={container}
        options={options}
        selected={value ? [value] : []}
        placeholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        listId={listId}
        onPick={(picked) => {
          onValueChange(picked);
          setOpen(false);
        }}
      />
    </PopoverPrimitive.Root>
  );
}
