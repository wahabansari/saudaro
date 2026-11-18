import type { FilterFn, Row, RowData } from '@tanstack/react-table';
import type { GridFilterType, GridFilterValue } from './DataGrid.types';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatNumber = (value: number) => numberFormat.format(value);

/** `14 Dec 2026` typed by a person to `2026-12-14`; `undefined` when it is not a date. */
export function parseDate(text: string): string | undefined {
  const time = Date.parse(`${text.trim()} UTC`);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString().slice(0, 10);
}

/** `2026-12-14` to `14 Dec 2026`. */
export const formatDate = (iso: string) => dateFormat.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** Display text for a raw cell value, used when a column has no custom `cell`. */
export function formatCellValue(value: unknown, type: GridFilterType | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'date' && typeof value === 'string') return formatDate(value);
  if (typeof value === 'number') return formatNumber(value);
  return String(value);
}

function matchesText<TData extends RowData>(row: Row<TData>, columnId: string, filter: GridFilterValue) {
  if (filter.type !== 'text') return true;
  return String(row.getValue(columnId) ?? '')
    .toLowerCase()
    .includes(filter.value.toLowerCase());
}

function matchesEnum<TData extends RowData>(row: Row<TData>, columnId: string, filter: GridFilterValue) {
  if (filter.type !== 'enum') return true;
  return filter.values.includes(String(row.getValue(columnId)));
}

function matchesNumber<TData extends RowData>(row: Row<TData>, columnId: string, filter: GridFilterValue) {
  if (filter.type !== 'number') return true;
  const cell = Number(row.getValue(columnId));
  return (filter.min === undefined || cell >= filter.min) && (filter.max === undefined || cell <= filter.max);
}

function matchesDate<TData extends RowData>(row: Row<TData>, columnId: string, filter: GridFilterValue) {
  if (filter.type !== 'date') return true;
  const cell = String(row.getValue(columnId) ?? '').slice(0, 10);
  return (!filter.from || cell >= filter.from) && (!filter.to || cell <= filter.to);
}

export function filterFnFor<TData extends RowData>(type: GridFilterType): FilterFn<TData> {
  const byType = { text: matchesText, enum: matchesEnum, number: matchesNumber, date: matchesDate };
  return byType[type] as FilterFn<TData>;
}

function describeRange(min: string | undefined, max: string | undefined) {
  if (min && max) return `${min} – ${max}`;
  return min ? `≥ ${min}` : `≤ ${max}`;
}

/** Chip text for one active filter, e.g. `Status: Open, Quoted`. */
export function describeFilter(label: string, filter: GridFilterValue): string {
  switch (filter.type) {
    case 'text':
      return `${label}: ${filter.value}`;
    case 'enum':
      return `${label}: ${filter.values.join(', ')}`;
    case 'number':
      return `${label}: ${describeRange(
        filter.min === undefined ? undefined : formatNumber(filter.min),
        filter.max === undefined ? undefined : formatNumber(filter.max),
      )}`;
    case 'date':
      return `${label}: ${describeRange(
        filter.from ? formatDate(filter.from) : undefined,
        filter.to ? formatDate(filter.to) : undefined,
      )}`;
  }
}
