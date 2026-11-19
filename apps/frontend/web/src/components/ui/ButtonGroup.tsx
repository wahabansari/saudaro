'use client';

import { useState, type ComponentProps } from 'react';
import clsx from 'clsx';

type Props = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  'aria-label': string;
  options: string[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export type ButtonGroupProps = Props;

export function ButtonGroup({
  options,
  value,
  defaultValue = options[0],
  onValueChange,
  className,
  ...props
}: Props) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  return (
    <div role="group" {...props} className={clsx('sa-btngroup max-w-full', className)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="sa-btn sa-btn--outline"
          aria-pressed={option === current}
          onClick={() => {
            setInner(option);
            onValueChange?.(option);
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
