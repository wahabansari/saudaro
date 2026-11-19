'use client';

import * as P from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useId, useState, type ComponentProps } from 'react';
import { Icon } from '@/icons';
import { ComboPanel, type ComboOption } from './ComboPanel';

const MAX_TAGS = 3;

export type MultiSelectProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  options: ComboOption[];
  label: string;
  searchLabel?: string;
  placeholder?: string;
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
};

export function MultiSelect({
  options,
  label,
  searchLabel = 'Search',
  placeholder = 'Select',
  defaultValue = [],
  onChange,
  className,
  ...props
}: MultiSelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);

  function update(next: string[]) {
    setValue(next);
    onChange?.(next);
  }
  const remove = (v: string) => update(value.filter((x) => x !== v));
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <div className={clsx('sa-field @container', className)} {...props}>
      <label htmlFor={id} className="sa-label">
        {label}
      </label>
      <P.Root open={open} onOpenChange={setOpen}>
        <div className="sa-combo group" data-open={open || undefined}>
          <P.Anchor asChild>
            <div
              className="sa-combo__trigger"
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('button')) setOpen(true);
              }}
            >
              <span className="sa-combo__tags">
                {value.length === 0 && <span className="sa-combo__ph">{placeholder}</span>}
                {value.slice(0, MAX_TAGS).map((v) => (
                  <span key={v} className="sa-tag">
                    {labelOf(v)}
                    <button
                      type="button"
                      aria-label={`Remove ${labelOf(v)}`}
                      onClick={() => remove(v)}
                      onKeyDown={(e) => e.key === 'Delete' && remove(v)}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
                {value.length > MAX_TAGS && <span className="sa-tag">+{value.length - MAX_TAGS}</span>}
              </span>
              <P.Trigger
                id={id}
                aria-haspopup="listbox"
                className="grid cursor-pointer place-items-center border-0 bg-transparent p-0 text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-card data-[state=closed]:![animation:none]"
              >
                <Icon name="chevron-down" size={20} className="group-data-[open]:rotate-180" />
              </P.Trigger>
            </div>
          </P.Anchor>
        </div>
        <P.Portal>
          <P.Content
            sideOffset={6}
            collisionPadding={16}
            aria-label={label}
            className="sa-combo__panel z-toast w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)]"
          >
            <ComboPanel
              multiple
              options={options}
              selected={value}
              onPick={(v) => update(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])}
              onEmptyBackspace={() => update(value.slice(0, -1))}
              searchLabel={searchLabel}
            >
              <div className="sa-combo__foot">
                <span>{value.length} selected</span>
                <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={() => update([])}>
                  Clear
                </button>
              </div>
            </ComboPanel>
          </P.Content>
        </P.Portal>
      </P.Root>
    </div>
  );
}
