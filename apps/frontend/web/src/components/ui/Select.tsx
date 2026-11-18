'use client';

import * as RadixSelect from '@radix-ui/react-select';
import clsx from 'clsx';
import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon } from '@/icons';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type RootProps = Pick<
  RadixSelect.SelectProps,
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'open'
  | 'defaultOpen'
  | 'onOpenChange'
  | 'name'
  | 'disabled'
  | 'required'
>;

export type SelectProps = Omit<
  ComponentPropsWithRef<typeof RadixSelect.Trigger>,
  'children' | keyof RootProps
> &
  RootProps & {
    options: SelectOption[];
    placeholder?: string;
    label?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
  };

export function Select({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  name,
  disabled,
  required,
  options,
  placeholder = 'Select…',
  label,
  hint,
  error,
  id: idProp,
  className,
  'aria-describedby': describedBy,
  ...props
}: SelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="sa-field">
      {label ? (
        <label className="sa-label" htmlFor={id}>
          {label}
          {required ? (
            <>
              {' '}
              <span className="sa-req" aria-hidden="true">
                *
              </span>
            </>
          ) : null}
        </label>
      ) : null}
      <RadixSelect.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        name={name}
        disabled={disabled}
        required={required}
      >
        <RadixSelect.Trigger
          id={id}
          className={clsx('sa-select text-left data-[state=closed]:![animation:none]', className)}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={clsx(describedBy, messageId) || undefined}
          {...props}
        >
          <RadixSelect.Value placeholder={<span className="sa-combo__ph">{placeholder}</span>} />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className="sa-menu z-dropdown"
            position="popper"
            sideOffset={6}
            style={{ minWidth: 'var(--radix-select-trigger-width)' }}
          >
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="sa-menu__item"
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="sa-menu__end">
                    <Icon name="check" size={16} className="text-action" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error ? (
        <span id={messageId} className="sa-error">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="sa-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
