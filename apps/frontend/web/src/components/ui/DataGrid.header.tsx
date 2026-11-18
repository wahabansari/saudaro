'use client';

import type { Column, RowData } from '@tanstack/react-table';
import { columnCellProps, isReferenceColumn } from './DataGrid.layout';
import { FilterDropdown } from './FilterDropdown';
import { ColumnMenu } from './GridMenus';
import type { GridFilterOption, GridFilterValue } from './DataGrid.types';

export const columnLabel = <TData extends RowData>(column: Column<TData, unknown>) =>
  typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id;

function enumOptions<TData extends RowData>(column: Column<TData, unknown>): GridFilterOption[] {
  if (column.columnDef.meta?.options) return column.columnDef.meta.options;
  return [...column.getFacetedUniqueValues()]
    .map(([value, count]) => ({ value: String(value), count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

function numberBounds<TData extends RowData>(column: Column<TData, unknown>) {
  const bounds = column.columnDef.meta?.bounds ?? column.getFacetedMinMaxValues();
  return bounds && bounds[0] < bounds[1] ? bounds : undefined;
}

type Props<TData extends RowData> = {
  column: Column<TData, unknown>;
  hasActions: boolean;
  filter?: GridFilterValue;
  onApplyFilter: (columnId: string, value: GridFilterValue | undefined) => void;
  isMenuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  portalContainer?: HTMLElement | null;
};

export function GridHeaderCell<TData extends RowData>({
  column,
  hasActions,
  filter,
  onApplyFilter,
  isMenuOpen,
  onMenuOpenChange,
  isFilterOpen,
  onFilterOpenChange,
  portalContainer,
}: Props<TData>) {
  const { className, style } = columnCellProps(column, hasActions);
  const type = column.columnDef.meta?.filter;
  const label = columnLabel(column);

  return (
    <th
      scope="col"
      className={className || undefined}
      style={{ ...style, width: column.getSize(), minWidth: column.getSize() }}
    >
      <div className="sa-th">
        <ColumnMenu
          label={label}
          open={isMenuOpen}
          onOpenChange={onMenuOpenChange}
          isPinned={column.getIsPinned() === 'left'}
          isLocked={isReferenceColumn(column)}
          onFilter={() => onFilterOpenChange(true)}
          onPin={() => column.pin('left')}
          onHide={() => column.toggleVisibility(false)}
        />
        {type ? (
          <FilterDropdown
            label={label}
            type={type}
            value={filter}
            options={type === 'enum' ? enumOptions(column) : undefined}
            bounds={type === 'number' ? numberBounds(column) : undefined}
            onApply={(value) => onApplyFilter(column.id, value)}
            open={isFilterOpen}
            onOpenChange={onFilterOpenChange}
            container={portalContainer}
          />
        ) : null}
      </div>
    </th>
  );
}
