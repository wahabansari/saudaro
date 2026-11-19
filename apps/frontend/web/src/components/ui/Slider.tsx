'use client';

import { useState, type ComponentProps } from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import clsx from 'clsx';

type Props = ComponentProps<typeof RadixSlider.Root> & {
  'aria-label': string;
  thumbLabels?: string[];
  format?: (value: number) => string;
};

export type SliderProps = Props;

export function Slider({
  thumbLabels,
  format,
  defaultValue = [0],
  value,
  onValueChange,
  className,
  ...props
}: Props) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  return (
    <RadixSlider.Root
      role="group"
      {...props}
      value={current}
      onValueChange={(next) => {
        setInner(next);
        onValueChange?.(next);
      }}
      className={clsx('sa-slider w-full min-w-0', className)}
    >
      <RadixSlider.Track className="sa-slider__track">
        <RadixSlider.Range className="sa-slider__fill" />
      </RadixSlider.Track>
      {current.map((n, i) => (
        <RadixSlider.Thumb
          key={i}
          aria-label={thumbLabels?.[i] ?? props['aria-label']}
          className="block size-0 outline-none focus-visible:[&>span]:shadow-[0_0_0_6px_var(--focus-halo)]"
        >
          <span className="sa-slider__thumb">
            {format && <span className="sa-slider__val !bottom-5 !left-1/2">{format(n)}</span>}
          </span>
        </RadixSlider.Thumb>
      ))}
    </RadixSlider.Root>
  );
}
