'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/icons';
import {
  addDays,
  addMonths,
  clampToBounds,
  compareDays,
  isOutOfBounds,
  isSameDay,
  monthCells,
  type DateRange,
} from './datePickerDates';

type Props = {
  initial: Date;
  draft: DateRange;
  canApply: boolean;
  minDate?: Date;
  maxDate?: Date;
  onPick: (date: Date) => void;
  onApply: () => void;
  onCancel: () => void;
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const KEY_STEPS: Record<string, (date: Date) => Date> = {
  ArrowLeft: (date) => addDays(date, -1),
  ArrowRight: (date) => addDays(date, 1),
  ArrowUp: (date) => addDays(date, -7),
  ArrowDown: (date) => addDays(date, 7),
  PageUp: (date) => addMonths(date, -1),
  PageDown: (date) => addMonths(date, 1),
};
const MONTH_TITLE = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const DAY_LABEL = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function DatePickerCalendar({
  initial,
  draft,
  canApply,
  minDate,
  maxDate,
  onPick,
  onApply,
  onCancel,
}: Props) {
  const [cursor, setCursor] = useState(initial);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const today = new Date();
  const { start, end } = draft;

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>('.sa-day[tabindex="0"]')?.focus();
  }, [cursor]);

  function moveCursor(next: Date) {
    shouldFocus.current = true;
    setCursor(clampToBounds(next, minDate, maxDate));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    moveCursor(step(cursor));
  }

  function dayClass(date: Date, outside: boolean) {
    const isStart = start !== null && isSameDay(date, start);
    const isEnd = end !== null && isSameDay(date, end);
    const isSingle = isStart && (end === null || isEnd);
    const isInside =
      start !== null && end !== null && compareDays(date, start) > 0 && compareDays(date, end) < 0;
    return clsx(
      'sa-day',
      outside && 'sa-day--out',
      isSameDay(date, today) && !isStart && !isEnd && 'sa-day--today',
      isInside && 'sa-day--in',
      (isStart || isEnd) && (isSingle || isStart ? 'sa-day--start' : 'sa-day--end'),
      isSingle && 'rounded-md',
    );
  }

  return (
    <>
      <div className="sa-cal__head">
        <button
          type="button"
          className="sa-iconbtn sa-iconbtn--sm"
          aria-label="Previous month"
          onClick={() => setCursor(addMonths(cursor, -1))}
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <strong>{MONTH_TITLE.format(cursor)}</strong>
        <button
          type="button"
          className="sa-iconbtn sa-iconbtn--sm"
          aria-label="Next month"
          onClick={() => setCursor(addMonths(cursor, 1))}
        >
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
      <div ref={gridRef} className="sa-cal__grid" role="grid" onKeyDown={handleKeyDown}>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="sa-cal__dow">
            {weekday}
          </span>
        ))}
        {monthCells(cursor).map(({ date, outside }) => (
          <button
            key={date.getTime()}
            type="button"
            className={dayClass(date, outside)}
            tabIndex={isSameDay(date, cursor) ? 0 : -1}
            disabled={isOutOfBounds(date, minDate, maxDate)}
            aria-label={DAY_LABEL.format(date)}
            aria-current={isSameDay(date, today) ? 'date' : undefined}
            aria-pressed={
              (start !== null && isSameDay(date, start)) || (end !== null && isSameDay(date, end))
            }
            onClick={() => {
              onPick(date);
              setCursor(date);
            }}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
      <div className="sa-cal__foot">
        <button
          type="button"
          className="sa-btn sa-btn--secondary sa-btn--sm"
          disabled={isOutOfBounds(today, minDate, maxDate)}
          onClick={() => {
            onPick(today);
            moveCursor(today);
          }}
        >
          Today
        </button>
        <span className="flex-1" />
        <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="sa-btn sa-btn--sm" disabled={!canApply} onClick={onApply}>
          Apply
        </button>
      </div>
    </>
  );
}
