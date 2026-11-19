import type { GridFilters, GridFilterValue } from '@/components/ui/DataGrid.types';

export type GridQuery = { filters: GridFilters; search: string; page: number; pageSize: number };
export type RawSearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const EMPTY_GRID_QUERY: GridQuery = { filters: {}, search: '', page: 1, pageSize: PAGE_SIZES[0] };

const FILTER_PREFIX = 'f.';
const SEARCH_KEY = 'q';
const PAGE_KEY = 'page';
const SIZE_KEY = 'size';
const RANGE_SEPARATOR = '..';
const LIST_SEPARATOR = ',';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function parseRange(text: string): [string, string] {
  const [from = '', to = ''] = text.split(RANGE_SEPARATOR);
  return [from, to];
}

function parseNumber(text: string): number | undefined {
  if (text === '') return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const parseIsoDate = (text: string) => (ISO_DATE.test(text) ? text : undefined);

export function parseFilter(encoded: string): GridFilterValue | undefined {
  const kind = encoded.slice(0, 2);
  const body = encoded.slice(2);
  if (kind === 't:' && body) return { type: 'text', value: body };
  if (kind === 'e:' && body) {
    return { type: 'enum', values: body.split(LIST_SEPARATOR).map(decodeURIComponent) };
  }
  if (kind === 'n:') {
    const [min, max] = parseRange(body).map(parseNumber);
    return min === undefined && max === undefined ? undefined : { type: 'number', min, max };
  }
  if (kind === 'd:') {
    const [from, to] = parseRange(body).map(parseIsoDate);
    return from === undefined && to === undefined ? undefined : { type: 'date', from, to };
  }
  return undefined;
}

export function encodeFilter(filter: GridFilterValue): string {
  switch (filter.type) {
    case 'text':
      return `t:${filter.value}`;
    case 'enum':
      return `e:${filter.values.map(encodeURIComponent).join(LIST_SEPARATOR)}`;
    case 'number':
      return `n:${filter.min ?? ''}${RANGE_SEPARATOR}${filter.max ?? ''}`;
    case 'date':
      return `d:${filter.from ?? ''}${RANGE_SEPARATOR}${filter.to ?? ''}`;
  }
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseGridQuery(raw: RawSearchParams): GridQuery {
  const filters: GridFilters = {};
  for (const [key, value] of Object.entries(raw)) {
    const text = first(value);
    if (!key.startsWith(FILTER_PREFIX) || text === undefined) continue;
    const filter = parseFilter(text);
    if (filter) filters[key.slice(FILTER_PREFIX.length)] = filter;
  }
  const size = parsePositiveInt(first(raw[SIZE_KEY]), EMPTY_GRID_QUERY.pageSize);
  return {
    filters,
    search: first(raw[SEARCH_KEY]) ?? '',
    page: parsePositiveInt(first(raw[PAGE_KEY]), 1),
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : EMPTY_GRID_QUERY.pageSize,
  };
}

const isGridKey = (key: string) =>
  key.startsWith(FILTER_PREFIX) || key === SEARCH_KEY || key === PAGE_KEY || key === SIZE_KEY;

/** Rewrites the grid keys of a query string and keeps every other key, such as `tab`. */
export function mergeGridQuery(currentSearch: string, query: GridQuery): string {
  const params = new URLSearchParams();
  new URLSearchParams(currentSearch).forEach((value, key) => {
    if (!isGridKey(key)) params.append(key, value);
  });
  for (const [id, filter] of Object.entries(query.filters)) {
    params.set(`${FILTER_PREFIX}${id}`, encodeFilter(filter));
  }
  if (query.search) params.set(SEARCH_KEY, query.search);
  if (query.page > 1) params.set(PAGE_KEY, String(query.page));
  if (query.pageSize !== EMPTY_GRID_QUERY.pageSize) params.set(SIZE_KEY, String(query.pageSize));
  return params.toString();
}
