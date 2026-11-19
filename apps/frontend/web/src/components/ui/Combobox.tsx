'use client';

import * as P from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useId, useState, type ComponentProps } from 'react';
import { Icon } from '@/icons';
import { ComboPanel, type ComboOption } from './ComboPanel';

export type ComboboxProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  options: ComboOption[];
  label: string;
  searchLabel?: string;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export function Combobox({
  options,
  label,
  searchLabel = 'Search',
  placeholder = 'Select',
  defaultValue,
  onChange,
  className,
  ...props
}: ComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const current = options.find((o) => o.value === value);

  function pick(next: string) {
    setValue(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div className={clsx('sa-field @container', className)} {...props}>
      <label id={id} className="sa-label">
        {label}
      </label>
      <P.Root open={open} onOpenChange={setOpen}>
        <div className="sa-combo" data-open={open || undefined}>
          <P.Trigger
            className="sa-combo__trigger data-[state=closed]:![animation:none]"
            aria-haspopup="listbox"
            aria-labelledby={`${id} ${id}-v`}
          >
            <span id={`${id}-v`} className={current ? undefined : 'sa-combo__ph'}>
              {current?.label ?? placeholder}
            </span>
            <Icon name="chevron-down" size={20} />
          </P.Trigger>
        </div>
        <P.Portal>
          <P.Content
            sideOffset={6}
            collisionPadding={16}
            aria-label={label}
            className="sa-combo__panel z-toast w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)]"
          >
            <ComboPanel
              options={options}
              selected={value ? [value] : []}
              onPick={pick}
              searchLabel={searchLabel}
            />
          </P.Content>
        </P.Portal>
      </P.Root>
    </div>
  );
}
