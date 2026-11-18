import type { CSSProperties } from 'react';
import type { Column, RowData } from '@tanstack/react-table';
import clsx from 'clsx';

/** Widths fixed by the bundle (`.sa-gt .cb` and `.sa-gt .stR`). */
export const CHECKBOX_COLUMN_WIDTH = 48;
export const ACTIONS_COLUMN_WIDTH = 64;

/** The locked column that identifies a row (the reference). */
export const isReferenceColumn = <TData extends RowData>(column: Column<TData, unknown>) =>
  column.columnDef.meta?.sticky === 'left';

/** Class and inline offset shared by a column's header, body and skeleton cells. */
export function columnCellProps<TData extends RowData>(column: Column<TData, unknown>, hasActions: boolean) {
  const pinned = column.getIsPinned();
  const style: CSSProperties = {};
  if (pinned === 'left' && column.getStart('left') > 0) {
    style.left = CHECKBOX_COLUMN_WIDTH + column.getStart('left');
  }
  if (pinned === 'right') {
    style.right = (hasActions ? ACTIONS_COLUMN_WIDTH : 0) + column.getAfter('right');
  }
  return {
    className: clsx(
      column.columnDef.meta?.align === 'right' && 'num',
      pinned === 'left' && 'st1',
      pinned === 'right' && 'stR',
    ),
    style,
  };
}
