'use client';

import * as P from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { Icon } from '@/icons';

const LOCALE = 'en-GB';
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, o);
const SHORT = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const LONG = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const MONTH = fmt({ month: 'long', year: 'numeric' });
const DOW = Array.from({ length: 7 }, (_, i) =>
  fmt({ weekday: 'short' })
    .format(new Date(2024, 0, 1 + i))
    .slice(0, 2),
);
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  fmt({ month: 'short' })
    .format(new Date(2024, i, 1))
    .slice(0, 3)
    .toLowerCase(),
);
const KEY_STEP: Record<string, [number, number]> = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowUp: [0, -7],
  ArrowDown: [0, 7],
  PageUp: [-1, 0],
  PageDown: [1, 0],
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const same = (a: Date, b: Date) => a.getTime() === b.getTime();

function parse(text: string) {
  const m = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})$/i.exec(text.trim());
  const month = m ? MONTHS.indexOf((m[2] ?? '').toLowerCase()) : -1;
  if (!m || month < 0) return undefined;
  const d = new Date(Number(m[3]), month, Number(m[1]));
  return d.getMonth() === month ? d : undefined;
}

export type DatePickerProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  label: string;
  range?: boolean;
  min?: Date;
  defaultValue?: Date[];
  onChange?: (value: Date[]) => void;
};

export function DatePicker({
  label,
  range,
  min,
  defaultValue = [],
  onChange,
  className,
  ...props
}: DatePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [draft, setDraft] = useState(value);
  const [cursor, setCursor] = useState(() => startOfDay(value[0] ?? new Date()));
  const [text, setText] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const today = startOfDay(new Date());
  const minDay = min && startOfDay(min);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    gridRef.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus();
  }, [cursor]);

  const shown = text ?? value.map((d) => SHORT.format(d)).join(' – ');
  const offset = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const total =
    Math.ceil((offset + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7) * 7;
  const days = Array.from(
    { length: total },
    (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset + i),
  );
  const [from, to] = draft;
  const isDisabled = (d: Date) => minDay !== undefined && d < minDay;

  function commit(next: Date[]) {
    setValue(next);
    setText(undefined);
    onChange?.(next);
  }

  function pick(d: Date) {
    setCursor(d);
    setDraft(range && from && !to ? [from, d].sort((a, b) => a.getTime() - b.getTime()) : [d]);
  }

  function shift(months: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + months, 1));
  }

  function handleGridKey(e: KeyboardEvent) {
    const step = KEY_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    moved.current = true;
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + step[0], cursor.getDate() + step[1]));
  }

  return (
    <P.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <div className={clsx('sa-field @container', className)} {...props}>
        <label className="sa-label" htmlFor={id}>
          {label}
        </label>
        <P.Anchor asChild>
          <div className="sa-inputwrap">
            <Icon name="calendar" size={20} />
            <input
              id={id}
              ref={inputRef}
              className="sa-input sa-input--icon"
              placeholder="DD MMM YYYY"
              role="combobox"
              aria-haspopup="dialog"
              aria-expanded={open}
              value={shown}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                const parsed = text === undefined || range ? undefined : parse(text);
                if (parsed) commit([parsed]);
                else setText(undefined);
              }}
              onClick={() => setOpen(true)}
              onKeyDown={(e) => e.key === 'ArrowDown' && setOpen(true)}
            />
          </div>
        </P.Anchor>
      </div>
      <P.Portal>
        <P.Content
          sideOffset={6}
          collisionPadding={16}
          aria-label="Choose dates"
          className="sa-cal z-toast max-w-[calc(100vw-2rem)]"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          onInteractOutside={(e) => e.target === inputRef.current && e.preventDefault()}
        >
          <div className="sa-cal__head">
            <button
              type="button"
              className="sa-iconbtn sa-iconbtn--sm"
              aria-label="Previous month"
              onClick={() => shift(-1)}
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <strong aria-live="polite">{MONTH.format(cursor)}</strong>
            <button
              type="button"
              className="sa-iconbtn sa-iconbtn--sm"
              aria-label="Next month"
              onClick={() => shift(1)}
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
          <div
            ref={gridRef}
            className="sa-cal__grid"
            role="grid"
            aria-label={MONTH.format(cursor)}
            onKeyDown={handleGridKey}
          >
            <div role="row" className="contents">
              {DOW.map((d, i) => (
                <span
                  key={d + i}
                  role="columnheader"
                  className="sa-cal__dow"
                  aria-label={fmt({ weekday: 'long' }).format(new Date(2024, 0, 1 + i))}
                >
                  {d}
                </span>
              ))}
            </div>
            {Array.from({ length: total / 7 }, (_, w) => (
              <div key={w} role="row" className="contents">
                {days.slice(w * 7, w * 7 + 7).map((d) => {
                  const isStart = !!from && same(d, from);
                  const isEnd = !!to && same(d, to);
                  const inRange = !!from && !!to && d > from && d < to;
                  return (
                    <div
                      key={d.getTime()}
                      role="gridcell"
                      className="contents"
                      aria-selected={isStart || isEnd || inRange}
                    >
                      <button
                        type="button"
                        className={clsx(
                          'sa-day',
                          d.getMonth() !== cursor.getMonth() && 'sa-day--out',
                          same(d, today) && 'sa-day--today',
                          inRange && 'sa-day--in',
                          isStart && 'sa-day--start',
                          (isEnd || (isStart && !to)) && 'sa-day--end',
                          isStart && !to && '!rounded-md',
                        )}
                        aria-label={LONG.format(d)}
                        aria-current={same(d, today) ? 'date' : undefined}
                        tabIndex={same(d, cursor) ? 0 : -1}
                        disabled={isDisabled(d)}
                        onClick={() => pick(d)}
                      >
                        {d.getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="sa-cal__foot flex-wrap">
            <button type="button" className="sa-btn sa-btn--secondary sa-btn--sm" onClick={() => pick(today)}>
              Today
            </button>
            <span className="flex-1" />
            <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="sa-btn sa-btn--sm"
              onClick={() => {
                commit(draft);
                setOpen(false);
              }}
            >
              Apply
            </button>
          </div>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
