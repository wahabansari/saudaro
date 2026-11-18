'use client';

import clsx from 'clsx';
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import { Icon } from '@/icons';

const HOLD_DELAY_MS = 500;
const REPEAT_INTERVAL_MS = 80;

export type NumberInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step'
> & {
  label?: ReactNode;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function NumberInput({
  label,
  value,
  defaultValue,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  disabled,
  id: idProp,
  className,
  ...props
}: NumberInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [text, setText] = useState(String(value ?? defaultValue ?? (Number.isFinite(min) ? min : 0)));
  const current = useRef(Number(text));
  const delay = useRef<ReturnType<typeof setTimeout>>(undefined);
  const repeat = useRef<ReturnType<typeof setInterval>>(undefined);
  const number = Number(text);

  useEffect(() => {
    if (value === undefined || value === current.current) return;
    current.current = value;
    setText(String(value));
  }, [value]);

  useEffect(() => stop, []);

  function clamp(next: number) {
    return Math.min(max, Math.max(min, next));
  }

  function commit(next: number) {
    current.current = next;
    setText(String(next));
    onValueChange?.(next);
  }

  function stepBy(direction: 1 | -1) {
    commit(clamp((Number.isFinite(current.current) ? current.current : 0) + direction * step));
  }

  function stop() {
    clearTimeout(delay.current);
    clearInterval(repeat.current);
  }

  function start(direction: 1 | -1) {
    stepBy(direction);
    delay.current = setTimeout(() => {
      repeat.current = setInterval(() => stepBy(direction), REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }

  function pressByKeyboard(event: MouseEvent, direction: 1 | -1) {
    if (event.detail === 0) stepBy(direction);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value;
    setText(typed);
    if (typed.trim() === '' || !Number.isFinite(Number(typed))) return;
    current.current = Number(typed);
    onValueChange?.(current.current);
  }

  function handleBlur() {
    commit(clamp(Number.isFinite(number) && text.trim() !== '' ? number : Number.isFinite(min) ? min : 0));
  }

  const dimmed = 'text-grey-400';

  return (
    <div className="sa-field">
      {label ? (
        <label className="sa-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="sa-numfield justify-self-start">
        <button
          type="button"
          aria-label="Decrease"
          disabled={disabled || number <= min}
          className={clsx((disabled || number <= min) && dimmed)}
          onPointerDown={() => start(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onClick={(event) => pressByKeyboard(event, -1)}
        >
          <Icon name="minus" size={16} />
        </button>
        <input
          id={id}
          className={className}
          inputMode="numeric"
          value={text}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        <button
          type="button"
          aria-label="Increase"
          disabled={disabled || number >= max}
          className={clsx((disabled || number >= max) && dimmed)}
          onPointerDown={() => start(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onClick={(event) => pressByKeyboard(event, 1)}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}
