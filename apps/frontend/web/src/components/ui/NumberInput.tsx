'use client';

import { useId, useState, type ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

type Props = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'size'
> & {
  label?: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
};

export type NumberInputProps = Props;

export function NumberInput({
  label,
  value,
  defaultValue = 0,
  min = -Infinity,
  max = Infinity,
  step = 1,
  onValueChange,
  className,
  id,
  ...props
}: Props) {
  const uid = useId();
  const inputId = id ?? uid;
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const set = (next: number) => {
    if (Number.isNaN(next)) return;
    const clamped = Math.min(max, Math.max(min, next));
    setInner(clamped);
    onValueChange?.(clamped);
  };
  return (
    <div className={clsx('max-w-full', className)}>
      {label && (
        <label className="sa-label mb-[6px] block" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="sa-numfield max-w-full">
        <button
          type="button"
          aria-label="Decrease"
          disabled={current <= min}
          onClick={() => set(current - step)}
          className="disabled:text-grey-400"
        >
          <Icon name="minus" size={20} />
        </button>
        <input
          {...props}
          id={inputId}
          inputMode="numeric"
          value={current}
          onChange={(e) => set(Number(e.target.value))}
          className="min-w-0"
        />
        <button
          type="button"
          aria-label="Increase"
          disabled={current >= max}
          onClick={() => set(current + step)}
          className="disabled:text-grey-400"
        >
          <Icon name="plus" size={20} />
        </button>
      </div>
    </div>
  );
}
