'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import clsx from 'clsx';
import { useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { Icon } from '@/icons';
import { DatePickerCalendar } from './DatePickerCalendar';
import {
  clampToBounds,
  compareDays,
  formatDate,
  formatRange,
  isOutOfBounds,
  parseDate,
  parseRange,
  type DateRange,
} from './datePickerDates';

export type { DateRange };

type Modes =
  | { mode?: 'single'; value: Date | null; onValueChange: (value: Date | null) => void }
  | { mode: 'range'; value: DateRange; onValueChange: (value: DateRange) => void };

export type DatePickerProps = Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type'> &
  Modes & { minDate?: Date; maxDate?: Date };

function nextDraft(draft: DateRange, date: Date, isRange: boolean): DateRange {
  if (!isRange || !draft.start || draft.end) return { start: date, end: null };
  return compareDays(date, draft.start) < 0 ? { start: date, end: draft.start } : { ...draft, end: date };
}

export function DatePicker({ minDate, maxDate, className, ...props }: DatePickerProps) {
  const { mode, value, onValueChange, ...inputProps } = props;
  const isRange = mode === 'range';
  const current: DateRange = isRange ? value : { start: value, end: null };
  const formatted = isRange ? formatRange(current) : current.start ? formatDate(current.start) : '';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(current);
  const [typed, setTyped] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  function commit(next: DateRange) {
    if (mode === 'range') onValueChange(next);
    else onValueChange(next.start);
  }

  function openCalendar() {
    if (open) return;
    setDraft(current);
    setOpen(true);
  }

  function commitTyped() {
    if (typed === null) return;
    const text = typed.trim();
    const parsed = isRange ? parseRange(text) : { start: parseDate(text), end: null };
    const dates = [parsed?.start, parsed?.end].flatMap((date) => date ?? []);
    const isValid =
      parsed !== null && dates.length > 0 && !dates.some((d) => isOutOfBounds(d, minDate, maxDate));
    if (isValid) commit(parsed);
    else if (!text) commit({ start: null, end: null });
    setTyped(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') commitTyped();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openCalendar();
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div ref={wrapRef} className={clsx('sa-inputwrap', className)}>
          <Icon name="calendar" size={20} />
          <input
            autoComplete="off"
            aria-haspopup="dialog"
            {...inputProps}
            className="sa-input sa-input--icon"
            value={typed ?? formatted}
            onChange={(event) => setTyped(event.target.value)}
            onClick={openCalendar}
            onBlur={commitTyped}
            onKeyDown={handleKeyDown}
          />
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={contentRef}
          className="sa-cal z-dropdown [--pop-origin:var(--radix-popover-content-transform-origin)]"
          sideOffset={6}
          align="start"
          aria-label="Choose dates"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.querySelector<HTMLElement>('.sa-day[tabindex="0"]')?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            wrapRef.current?.querySelector('input')?.focus();
          }}
          onInteractOutside={(event) => {
            if (wrapRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
        >
          <DatePickerCalendar
            initial={clampToBounds(current.start ?? new Date(), minDate, maxDate)}
            draft={draft}
            canApply={draft.start !== null && (!isRange || draft.end !== null)}
            minDate={minDate}
            maxDate={maxDate}
            onPick={(date) => setDraft((prev) => nextDraft(prev, date, isRange))}
            onApply={() => {
              commit(draft);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
