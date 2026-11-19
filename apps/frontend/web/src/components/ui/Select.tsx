'use client';

import { useId, type ComponentProps } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import clsx from 'clsx';
import { Icon } from '@/icons';

type Props = Omit<ComponentProps<typeof RadixSelect.Root>, 'children'> & {
  options: string[];
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  id?: string;
  className?: string;
};

export type SelectProps = Props;

export function Select({
  options,
  label,
  placeholder = 'Select…',
  hint,
  error,
  id,
  className,
  ...props
}: Props) {
  const uid = useId();
  const triggerId = id ?? uid;
  const noteId = `${triggerId}-note`;
  return (
    <div className="sa-field min-w-0">
      {label && (
        <label className="sa-label" htmlFor={triggerId}>
          {label}
        </label>
      )}
      <RadixSelect.Root {...props}>
        <RadixSelect.Trigger
          id={triggerId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? noteId : undefined}
          className={clsx(
            'sa-select min-w-0 text-left data-[placeholder]:text-grey-500 data-[state=closed]:![animation:none]',
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="sa-menu z-dropdown !min-w-[var(--radix-select-trigger-width)]"
          >
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option}
                  value={option}
                  className="sa-menu__item outline-none data-[highlighted]:bg-grey-100"
                >
                  <RadixSelect.ItemText>{option}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="sa-menu__end">
                    <Icon name="check" size={16} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error ? (
        <span id={noteId} className="sa-error">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : (
        hint && (
          <span id={noteId} className="sa-hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
