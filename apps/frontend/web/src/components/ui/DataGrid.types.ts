import type { ColumnDef, RowData } from '@tanstack/react-table';

export type GridFilterType = 'text' | 'enum' | 'number' | 'date';

export type GridFilterOption = { value: string; label?: string; count?: number };

/** One column filter. Plain JSON, so the whole `GridFilters` object can be mirrored in URL search params. */
export type GridFilterValue =
  | { type: 'text'; value: string }
  | { type: 'enum'; values: string[] }
  | { type: 'number'; min?: number; max?: number }
  | { type: 'date'; from?: string; to?: string };

/** Active filters keyed by column id. */
export type GridFilters = Record<string, GridFilterValue>;

/** Compact rows are 40px, comfortable (the default) 48px. */
export type GridDensity = 'compact' | 'comfortable';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filter: GridFilterType;
    align?: 'right';
    sticky?: 'left' | 'right';
    /** Enum options with labels or counts; needed in server-side mode, otherwise taken from the loaded rows. */
    options?: GridFilterOption[];
    /** Slider limits of a number range; needed in server-side mode, otherwise taken from the loaded rows. */
    bounds?: readonly [min: number, max: number];
    /** Loading skeleton shape of the cell (the preview mixes shapes per column); a line by default. */
    skeleton?: 'pill' | 'stack' | 'avatar';
  }
}

// TanStack's own convention: a column list mixes accessors with different value types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridColumnDef<TData extends RowData> = ColumnDef<TData, any>;
