export type DateRange = { start: Date | null; end: Date | null };

const MONTH_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short' });
const MONTH_NAMES = Array.from({ length: 12 }, (_, month) =>
  MONTH_SHORT.format(new Date(2026, month, 1)).toLowerCase(),
);
const DATE_PATTERN = /^(\d{1,2})\s+([a-z]{3,})\s+(\d{4})$/i;
const RANGE_SEPARATOR = /\s+(?:to|-|–)\s+/i;

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function addMonths(date: Date, months: number) {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay));
}

export const compareDays = (a: Date, b: Date) =>
  new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() -
  new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();

export const isSameDay = (a: Date, b: Date) => compareDays(a, b) === 0;

export function isOutOfBounds(date: Date, min?: Date, max?: Date) {
  return (
    (min !== undefined && compareDays(date, min) < 0) || (max !== undefined && compareDays(date, max) > 0)
  );
}

export function clampToBounds(date: Date, min?: Date, max?: Date) {
  if (min !== undefined && compareDays(date, min) < 0) return min;
  if (max !== undefined && compareDays(date, max) > 0) return max;
  return date;
}

export function monthCells(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = leading + new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, index) => ({
    date: new Date(year, month, 1 - leading + index),
    outside: index < leading,
  }));
}

export const formatDate = (date: Date) =>
  `${date.getDate()} ${MONTH_SHORT.format(date)} ${date.getFullYear()}`;

export const formatRange = ({ start, end }: DateRange) =>
  [start, end].flatMap((date) => (date ? formatDate(date) : [])).join(' to ');

export function parseDate(text: string) {
  const match = DATE_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, day = '', name = '', year = ''] = match;
  const month = MONTH_NAMES.indexOf(name.slice(0, 3).toLowerCase());
  const date = new Date(Number(year), month, Number(day));
  return month < 0 || date.getMonth() !== month ? null : date;
}

export function parseRange(text: string): DateRange | null {
  const [first, second, ...rest] = text.split(RANGE_SEPARATOR);
  const start = parseDate(first ?? '');
  const end = second === undefined ? null : parseDate(second);
  if (!start || rest.length || (second !== undefined && !end)) return null;
  return { start, end };
}
