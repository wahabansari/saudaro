'use client';

import * as RadixSlider from '@radix-ui/react-slider';
import clsx from 'clsx';
import { useState } from 'react';

export type SliderProps = Omit<RadixSlider.SliderProps, 'children'> & {
  thumbLabels?: string[];
  formatValue?: (value: number) => string;
};

export function Slider({
  value,
  defaultValue,
  min = 0,
  onValueChange,
  thumbLabels,
  formatValue,
  className,
  ...props
}: SliderProps) {
  const [inner, setInner] = useState(defaultValue ?? [min]);
  const values = value ?? inner;

  function change(next: number[]) {
    setInner(next);
    onValueChange?.(next);
  }

  return (
    <RadixSlider.Root
      className={clsx('sa-slider', className)}
      role="group"
      min={min}
      value={values}
      onValueChange={change}
      {...props}
    >
      <RadixSlider.Track className="sa-slider__track">
        <RadixSlider.Range className="sa-slider__fill" />
      </RadixSlider.Track>
      {values.map((current, index) => (
        <RadixSlider.Thumb key={index} className="sa-slider__thumb" aria-label={thumbLabels?.[index]}>
          {formatValue ? (
            <span className="sa-slider__val" style={{ left: '50%', bottom: 20 }}>
              {formatValue(current)}
            </span>
          ) : null}
        </RadixSlider.Thumb>
      ))}
    </RadixSlider.Root>
  );
}
