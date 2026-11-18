'use client';

import { flexRender, type Row, type RowData } from '@tanstack/react-table';
import clsx from 'clsx';
import { Icon } from '@/icons';
import { formatCellValue } from './DataGrid.filters';
import { columnCellProps, isReferenceColumn } from './DataGrid.layout';
import { RowActionsMenu, type GridRowAction } from './GridMenus';

type Props<TData extends RowData> = {
  row: Row<TData>;
  /** Names the row for assistive tech, usually its reference. */
  label: string;
  hasActions: boolean;
  actions?: GridRowAction[];
};

export function GridRow<TData extends RowData>({ row, label, hasActions, actions }: Props<TData>) {
  return (
    <tr aria-selected={row.getIsSelected() || undefined}>
      <td className="cb">
        <label className="sa-check" aria-label={`Select ${label}`}>
          <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
          <span className="sa-check__box">
            <Icon name="check" />
          </span>
        </label>
      </td>
      {row.getVisibleCells().map((cell) => {
        const { className, style } = columnCellProps(cell.column, hasActions);
        const value = cell.getValue();
        const hasText = typeof value === 'string' || typeof value === 'number';
        return (
          <td
            key={cell.id}
            className={clsx(className, isReferenceColumn(cell.column) && 'ref') || undefined}
            style={style}
            title={hasText ? formatCellValue(value, cell.column.columnDef.meta?.filter) : undefined}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
      {actions ? (
        <td className="stR">
          <RowActionsMenu rowLabel={label} actions={actions} />
        </td>
      ) : null}
    </tr>
  );
}
