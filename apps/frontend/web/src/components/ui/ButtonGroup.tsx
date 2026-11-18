'use client';

import clsx from 'clsx';
import { useState } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

export type ButtonGroupItem = { value: string; label: ReactNode };

export type ButtonGroupProps = Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'defaultValue' | 'onChange'
> & {
  items: ButtonGroupItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export function ButtonGroup({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: ButtonGroupProps) {
  const [inner, setInner] = useState(defaultValue);
  const selected = value ?? inner;

  function select(next: string) {
    setInner(next);
    onValueChange?.(next);
  }

  return (
    <div className={clsx('sa-btngroup', className)} role="group" {...props}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className="sa-btn sa-btn--outline"
          aria-pressed={item.value === selected}
          onClick={() => select(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
