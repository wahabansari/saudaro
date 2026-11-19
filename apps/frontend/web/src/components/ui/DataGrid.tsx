'use client';

import { useMemo, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import {
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type Column,
  type ColumnPinningState,
  type RowData,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { Icon } from '@/icons';
import { GridRow } from './DataGrid.row';
import { columnLabel, GridHeaderCell } from './DataGrid.header';
import { describeFilter, filterFnFor, formatCellValue } from './DataGrid.filters';
import { isReferenceColumn } from './DataGrid.layout';
import { GridBulkBar, GridChips, GridFooter, GridToolbar, type GridChip } from './DataGrid.parts';
import type { GridColumnDef, GridDensity, GridFilters, GridFilterValue } from './DataGrid.types';
import { ColumnPicker, type GridRowAction } from './GridMenus';
import { GridEmpty, GridSkeletonRows, type GridEmptyProps } from './GridStates';

export type DataGridProps<TData extends RowData> = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  title: string;
  columns: GridColumnDef<TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  /** Active column filters; mirror them in the URL search params. */
  filters: GridFilters;
  onFiltersChange: (filters: GridFilters) => void;
  search: string;
  onSearchChange: (search: string) => void;
  /** 1-based page number. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  /** Server-side mode: `data` is already filtered and paged, `rowCount` is the total match count. */
  rowCount?: number;
  isLoading?: boolean;
  /** Actions of the row menu; the first is the default action, danger ones go last. */
  rowActions?: (row: TData) => GridRowAction[];
  /** Actions shown in the bulk bar for the selected rows. */
  bulkActions?: (rows: TData[]) => ReactNode;
  /** Extra toolbar buttons, such as Export and the primary action. */
  toolbarActions?: ReactNode;
  searchPlaceholder?: string;
  /** Shown when filters or search leave no rows. */
  noResults: Pick<GridEmptyProps, 'title' | 'description'>;
  /** Shown when there are no rows and nothing is filtered. */
  firstUse?: GridEmptyProps;
  /** Height limit of the scroll area, e.g. `440px`. */
  maxHeight?: string;
  defaultDensity?: GridDensity;
  /** Selected row ids on first render. */
  defaultRowSelection?: RowSelectionState;
  /** Column id whose filter popover is open; set it (with `onOpenFilterChange`) to control the popover. */
  openFilterId?: string | null;
  onOpenFilterChange?: (columnId: string | null) => void;
  /** Portal target of the filter popovers, for rendering them inside a wrapper. */
  portalContainer?: HTMLElement | null;
};

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const;
const DENSITY_LABEL: Record<GridDensity, string> = { compact: 'Compact', comfortable: 'Comfortable' };
const OTHER_DENSITY: Record<GridDensity, GridDensity> = { compact: 'comfortable', comfortable: 'compact' };

const columnIdOf = <TData extends RowData>(column: GridColumnDef<TData>) =>
  column.id ?? ('accessorKey' in column ? String(column.accessorKey) : '');

function initialPinning<TData extends RowData>(columns: GridColumnDef<TData>[]): ColumnPinningState {
  const idsFor = (side: 'left' | 'right') =>
    columns.filter((column) => column.meta?.sticky === side).map(columnIdOf);
  return { left: idsFor('left'), right: idsFor('right') };
}

export function DataGrid<TData extends RowData>({
  title,
  columns,
  data,
  getRowId,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  rowCount,
  isLoading = false,
  rowActions,
  bulkActions,
  toolbarActions,
  searchPlaceholder,
  noResults,
  firstUse,
  maxHeight,
  defaultDensity = 'comfortable',
  defaultRowSelection = {},
  openFilterId,
  onOpenFilterChange,
  portalContainer,
  className,
  style,
  ...rest
}: DataGridProps<TData>) {
  const isServerSide = rowCount !== undefined;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(defaultRowSelection);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() => initialPinning(columns));
  const [density, setDensity] = useState(defaultDensity);
  const [menuColumnId, setMenuColumnId] = useState<string | null>(null);
  const [innerFilterId, setInnerFilterId] = useState<string | null>(null);
  const filterColumnId = openFilterId === undefined ? innerFilterId : openFilterId;
  const setFilterColumnId = onOpenFilterChange ?? setInnerFilterId;

  const tableColumns = useMemo(
    () =>
      columns.map((column): GridColumnDef<TData> => ({
        ...column,
        cell: column.cell ?? ((info) => formatCellValue(info.getValue(), info.column.columnDef.meta?.filter)),
        filterFn: column.meta?.filter ? filterFnFor<TData>(column.meta.filter) : undefined,
      })),
    [columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId,
    state: {
      columnFilters: Object.entries(filters).map(([id, value]) => ({ id, value })),
      globalFilter: search,
      rowSelection,
      columnVisibility,
      columnPinning,
      pagination: { pageIndex: page - 1, pageSize },
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    globalFilterFn: 'includesString',
    manualFiltering: isServerSide,
    manualPagination: isServerSide,
    rowCount,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  });

  const rows = table.getRowModel().rows;
  const total = rowCount ?? table.getPrePaginationRowModel().rows.length;
  const hasActions = rowActions !== undefined;
  const visibleColumns: Column<TData, unknown>[] = [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ];
  const allColumns = table.getAllLeafColumns();
  const referenceColumn = allColumns.find(isReferenceColumn);
  const selectedRows = table.getSelectedRowModel().rows;

  const setFilter = (columnId: string, value: GridFilterValue | undefined) => {
    const { [columnId]: _previous, ...others } = filters;
    onFiltersChange(value ? { ...others, [columnId]: value } : others);
    onPageChange(1);
  };
  const changeSearch = (next: string) => {
    onSearchChange(next);
    onPageChange(1);
  };
  const clearAll = () => {
    onFiltersChange({});
    onSearchChange('');
    onPageChange(1);
  };

  const chips: GridChip[] = [
    ...(search
      ? [{ id: 'search', label: 'Search', text: `Search: ${search}`, onRemove: () => changeSearch('') }]
      : []),
    ...Object.entries(filters).flatMap(([id, filter]) => {
      const column = table.getColumn(id);
      return column
        ? [
            {
              id,
              label: columnLabel(column),
              text: describeFilter(columnLabel(column), filter),
              onRemove: () => setFilter(id, undefined),
            },
          ]
        : [];
    }),
  ];

  const rowLabel = (rowId: string, value: unknown) => (value === undefined ? rowId : String(value));
  const isEmpty = !isLoading && rows.length === 0;
  const emptyContent = !chips.length && firstUse ? firstUse : { ...noResults, action: undefined };

  return (
    <div
      className={clsx('sa-grid', density === 'compact' && 'sa-grid--compact', className)}
      style={{ ...style, ...(maxHeight ? ({ '--grid-h': maxHeight } as CSSProperties) : null) }}
      {...rest}
    >
      {selectedRows.length > 0 ? (
        <GridBulkBar count={selectedRows.length} onClear={() => table.resetRowSelection()}>
          {bulkActions?.(selectedRows.map((row) => row.original))}
        </GridBulkBar>
      ) : (
        <GridToolbar
          title={title}
          total={total}
          search={search}
          onSearchChange={changeSearch}
          searchPlaceholder={searchPlaceholder}
        >
          <ColumnPicker
            columns={allColumns.map((column) => ({
              id: column.id,
              label: columnLabel(column),
              isVisible: column.getIsVisible(),
              isLocked: isReferenceColumn(column),
            }))}
            onToggle={(id, isVisible) => table.getColumn(id)?.toggleVisibility(isVisible)}
            onReset={() => {
              table.resetColumnVisibility();
              table.setColumnPinning(initialPinning(columns));
            }}
          />
          <button
            type="button"
            className="sa-btn sa-btn--secondary sa-btn--sm"
            onClick={() => setDensity(OTHER_DENSITY[density])}
          >
            <Icon name="rows" />
            {DENSITY_LABEL[density]}
          </button>
          {toolbarActions}
        </GridToolbar>
      )}
      {chips.length > 0 ? <GridChips chips={chips} onClearAll={clearAll} /> : null}
      <div className="sa-grid__body">
        <div
          className={clsx('sa-grid__scroll', isEmpty && 'sa-grid__scroll--empty')}
          tabIndex={0}
          role="region"
          aria-label={`${title} table, scrollable`}
          aria-busy={isLoading || undefined}
        >
          <table className="sa-gt">
            <thead>
              <tr>
                <th className="cb" scope="col">
                  <label className="sa-check" aria-label="Select all rows">
                    <input
                      type="checkbox"
                      checked={table.getIsAllPageRowsSelected()}
                      onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
                    />
                    <span className="sa-check__box">
                      <Icon name="check" />
                    </span>
                  </label>
                </th>
                {visibleColumns.map((column) => (
                  <GridHeaderCell
                    key={column.id}
                    column={column}
                    hasActions={hasActions}
                    filter={filters[column.id]}
                    onApplyFilter={setFilter}
                    isMenuOpen={menuColumnId === column.id}
                    onMenuOpenChange={(open) => setMenuColumnId(open ? column.id : null)}
                    isFilterOpen={filterColumnId === column.id}
                    onFilterOpenChange={(open) => setFilterColumnId(open ? column.id : null)}
                    portalContainer={portalContainer}
                  />
                ))}
                {hasActions ? (
                  <th className="stR" scope="col">
                    <span className="sa-sr">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            {isEmpty ? null : (
              <tbody>
                {isLoading ? (
                  <GridSkeletonRows columns={visibleColumns} hasActions={hasActions} />
                ) : (
                  rows.map((row) => (
                    <GridRow
                      key={row.id}
                      row={row}
                      label={rowLabel(row.id, referenceColumn && row.getValue(referenceColumn.id))}
                      hasActions={hasActions}
                      actions={rowActions?.(row.original)}
                    />
                  ))
                )}
              </tbody>
            )}
          </table>
          {isEmpty ? (
            <GridEmpty
              {...emptyContent}
              action={
                emptyContent.action ?? (
                  <button type="button" className="sa-btn sa-btn--secondary sa-btn--sm" onClick={clearAll}>
                    Clear all filters
                  </button>
                )
              }
            />
          ) : null}
        </div>
      </div>
      <GridFooter
        page={page}
        pageSize={pageSize}
        total={total}
        count={rows.length}
        pageSizeOptions={pageSizeOptions}
        onPageChange={onPageChange}
        onPageSizeChange={(size) => {
          onPageSizeChange(size);
          onPageChange(1);
        }}
      />
    </div>
  );
}
