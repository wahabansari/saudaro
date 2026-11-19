'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { describeFilter, filterFns, type FilterValue, type GridFilters } from './dataGridFilters';
import { FilterDropdown } from './FilterDropdown';
import { ColumnPicker, RowActionsMenu, type RowAction } from './GridMenus';
import { BAR_WRAP, Check, DensityButton, GridBulk, GridChips, GridFooter, SearchField } from './GridParts';
import { GridEmpty, GridSkeleton } from './GridStates';

export type { ColumnDef } from '@tanstack/react-table';

export type DataGridProps<T> = {
  title: string;
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder: string;
  empty: { title: string; description: string };
  getRowId?: (row: T) => string;
  filters?: GridFilters;
  onFiltersChange?: (filters: GridFilters) => void;
  actions?: ReactNode;
  bulkActions?: (rows: T[]) => ReactNode;
  rowActions?: (row: T) => RowAction[];
  defaultSelected?: string[];
  loading?: boolean;
  height?: number;
  className?: string;
};

const DENSITIES = ['Default', 'Comfortable', 'Compact'] as const;
const DENSITY_CLASS = { Default: '', Comfortable: 'sa-grid--comfy', Compact: 'sa-grid--compact' };

const cellClass = <T,>(column: Column<T>) =>
  clsx(
    column.columnDef.meta?.sticky === 'left' && 'st1 ref',
    column.columnDef.meta?.sticky === 'right' && 'stR',
    column.columnDef.meta?.align === 'right' && 'num',
  );

export function DataGrid<T>({
  title,
  columns,
  data,
  searchPlaceholder,
  empty,
  getRowId,
  filters: controlledFilters,
  onFiltersChange,
  actions,
  bulkActions,
  rowActions,
  defaultSelected = [],
  loading,
  height = 440,
  className,
}: DataGridProps<T>) {
  const [ownFilters, setOwnFilters] = useState<GridFilters>([]);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<RowSelectionState>(() =>
    Object.fromEntries(defaultSelected.map((id) => [id, true])),
  );
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [density, setDensity] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const filters = controlledFilters ?? ownFilters;
  const setFilters = onFiltersChange ?? setOwnFilters;
  const gridColumns = useMemo(
    () => columns.map((c) => ({ ...c, filterFn: filterFns[c.meta?.filter ?? 'text'] as FilterFn<T> })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: gridColumns,
    getRowId,
    state: {
      columnFilters: filters as ColumnFiltersState,
      globalFilter: search,
      rowSelection: selection,
      columnVisibility: visibility,
      pagination,
    },
    onGlobalFilterChange: setSearch,
    onRowSelectionChange: setSelection,
    onColumnVisibilityChange: setVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const setFilter = (id: string, value?: FilterValue) =>
    setFilters([...filters.filter((f) => f.id !== id), ...(value ? [{ id, value }] : [])]);
  const clearAll = () => {
    setFilters([]);
    setSearch('');
  };
  const labelOf = (id: string) => String(table.getColumn(id)?.columnDef.header);

  const leaves = table.getAllLeafColumns();
  const refId = (leaves.find((c) => c.columnDef.meta?.sticky === 'left') ?? leaves[0])?.id ?? '';
  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = pagination;
  const selectedCount = Object.keys(selection).length;
  const isEmpty = !loading && rows.length === 0;
  const nextDensity = (density + 1) % DENSITIES.length;
  const clearSelection = () => table.resetRowSelection();

  return (
    <div className="@container min-w-0">
      <div
        className={clsx('sa-grid', DENSITY_CLASS[DENSITIES[density] ?? 'Default'], className)}
        style={{ '--grid-h': `${height}px` } as CSSProperties}
      >
        {selectedCount > 0 ? (
          <GridBulk count={selectedCount} onClear={clearSelection}>
            {bulkActions?.(table.getSelectedRowModel().flatRows.map((r) => r.original))}
          </GridBulk>
        ) : (
          <div className={clsx('sa-grid__bar', BAR_WRAP)}>
            <h3>{title}</h3>
            <span className="sa-badge sa-badge--neutral">{data.length}</span>
            <SearchField
              className="order-last basis-full @3xl:order-none @3xl:basis-auto"
              label={`Search ${title}`}
              placeholder={searchPlaceholder}
              clearLabel="Clear"
              value={search}
              onChange={setSearch}
            />
            <span className="sa-grow" />
            <ColumnPicker
              columns={leaves.map((c) => ({
                id: c.id,
                label: labelOf(c.id),
                visible: c.getIsVisible(),
                locked: c.id === refId,
              }))}
              onToggle={(id) => table.getColumn(id)?.toggleVisibility()}
              onReset={() => table.resetColumnVisibility()}
            />
            <DensityButton label={DENSITIES[nextDensity] ?? ''} onClick={() => setDensity(nextDensity)} />
            {actions}
          </div>
        )}
        {filters.length > 0 && (
          <GridChips
            chips={filters.map(({ id, value }) => ({ id, label: labelOf(id), text: describeFilter(value) }))}
            onRemove={setFilter}
            onClear={clearAll}
          />
        )}
        <div className="sa-grid__body">
          <div
            className={clsx('sa-grid__scroll', isEmpty && 'sa-grid__scroll--empty')}
            tabIndex={0}
            role="region"
            aria-label={`${title} table, scrollable`}
            aria-busy={loading || undefined}
          >
            <table className="sa-gt">
              <thead>
                <tr>
                  <th className="cb" scope="col">
                    <Check
                      label="Select all rows"
                      checked={table.getIsAllPageRowsSelected()}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                  </th>
                  {table.getVisibleLeafColumns().map((column) => {
                    const kind = column.columnDef.meta?.filter ?? 'text';
                    const label = labelOf(column.id);
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        className={cellClass(column)}
                        style={{ width: column.getSize(), minWidth: column.getSize() }}
                      >
                        <div className="sa-th">
                          <span className="sa-th__label">{label}</span>
                          <FilterDropdown
                            label={label}
                            kind={kind}
                            value={filters.find((f) => f.id === column.id)?.value}
                            onChange={(value) => setFilter(column.id, value)}
                            options={
                              kind === 'enum'
                                ? [...column.getFacetedUniqueValues()].map(([value, count]) => ({
                                    value: String(value),
                                    count,
                                  }))
                                : undefined
                            }
                            range={kind === 'number' ? column.getFacetedMinMaxValues() : undefined}
                          />
                        </div>
                      </th>
                    );
                  })}
                  {rowActions && (
                    <th className="stR" scope="col">
                      <span className="sa-sr">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              {loading ? (
                <GridSkeleton
                  columns={table.getVisibleLeafColumns().map((c) => ({ ...c.columnDef.meta }))}
                  withActions={!!rowActions}
                />
              ) : (
                <tbody>
                  {rows.map((row) => {
                    const label = String(row.getValue(refId));
                    return (
                      <tr key={row.id} aria-selected={row.getIsSelected() || undefined}>
                        <td className="cb">
                          <Check
                            label={`Select ${label}`}
                            checked={row.getIsSelected()}
                            onChange={row.getToggleSelectedHandler()}
                          />
                        </td>
                        {row.getVisibleCells().map((cell) => {
                          const value = cell.getValue();
                          return (
                            <td
                              key={cell.id}
                              className={cellClass(cell.column)}
                              title={typeof value === 'string' ? value : undefined}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                        {rowActions && (
                          <td className="stR">
                            <RowActionsMenu
                              label={`Row actions for ${label}`}
                              actions={rowActions(row.original)}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
            {isEmpty && (
              <GridEmpty
                title={empty.title}
                description={empty.description}
                onClear={filters.length > 0 || search ? clearAll : undefined}
              />
            )}
          </div>
        </div>
        <GridFooter
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={table.getPageCount()}
          total={total}
          onPageSize={table.setPageSize}
          onPage={table.setPageIndex}
        />
      </div>
    </div>
  );
}
