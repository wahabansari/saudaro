import type { FilterFn, RowData } from '@tanstack/react-table';

export type FilterKind = 'text' | 'enum' | 'number' | 'date';
export type RangeFilter = { from?: string; to?: string };
export type FilterValue = string | string[] | RangeFilter;
export type GridFilters = { id: string; value: FilterValue }[];

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filter: FilterKind;
    align?: 'right';
    sticky?: 'left' | 'right';
  }
}

const DAY_MS = 86_400_000;

export const formatNumber = (n: number) => n.toLocaleString('en-US');

export const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;

const bound = (text: string | undefined, parse: (t: string) => number, fallback: number) => {
  const n = text ? parse(text) : NaN;
  return Number.isNaN(n) ? fallback : n;
};
const toNumber = (t: string) => Number(t.replace(/,/g, ''));

export const filterFns: Record<FilterKind, FilterFn<RowData>> = {
  text: (row, id, text: string) => String(row.getValue(id)).toLowerCase().includes(text.toLowerCase()),
  enum: (row, id, values: string[]) => values.includes(String(row.getValue(id))),
  number: (row, id, { from, to }: RangeFilter) => {
    const n = Number(row.getValue(id));
    return n >= bound(from, toNumber, -Infinity) && n <= bound(to, toNumber, Infinity);
  },
  date: (row, id, { from, to }: RangeFilter) => {
    const t = Date.parse(String(row.getValue(id)));
    return t >= bound(from, Date.parse, -Infinity) && t < bound(to, Date.parse, Infinity - DAY_MS) + DAY_MS;
  },
};

export const isEmptyFilter = (value: FilterValue) =>
  typeof value === 'string' || Array.isArray(value) ? value.length === 0 : !value.from && !value.to;

export function describeFilter(value: FilterValue) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return `${value.from ?? '…'}–${value.to ?? '…'}`;
}
