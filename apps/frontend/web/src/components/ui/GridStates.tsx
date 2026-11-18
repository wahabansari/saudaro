'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Column, RowData } from '@tanstack/react-table';
import { Icon, type IconName } from '@/icons';
import { columnCellProps, isReferenceColumn } from './DataGrid.layout';
import { EmptyState } from './EmptyState';

export const SKELETON_ROW_COUNT = 7;

/** Deterministic width so skeleton rows look varied without random values on the server. */
const widthPercent = (row: number, column: number) => 40 + ((row * 37 + column * 53 + 11) % 45);
const pillWidth = (row: number, column: number) => 76 + ((row * 3 + column * 5) % 9);

const percent = (value: number, height?: number): CSSProperties => ({
  width: `${value}%`,
  ...(height ? { height } : null),
});

const SECONDARY_LINE_HEIGHT = 10;
const REFERENCE_LINE_HEIGHT = 14;

function SkeletonCell<TData extends RowData>({
  column,
  row,
  index,
}: {
  column: Column<TData, unknown>;
  row: number;
  index: number;
}) {
  const meta = column.columnDef.meta;
  const width = widthPercent(row, index);
  const line = <span className="sa-skel sa-skel--line" style={percent(width)} />;

  if (isReferenceColumn(column)) {
    return <span className="sa-skel sa-skel--line" style={percent(width, REFERENCE_LINE_HEIGHT)} />;
  }
  if (meta?.skeleton === 'stack') {
    return (
      <div className="sa-skel-stack">
        {line}
        <span
          className="sa-skel sa-skel--line"
          style={percent(Math.max(width - 36, 30), SECONDARY_LINE_HEIGHT)}
        />
      </div>
    );
  }
  if (meta?.skeleton === 'avatar') {
    return (
      <div className="sa-skel-cell">
        <span className="sa-skel sa-skel--dot" />
        {line}
      </div>
    );
  }
  if (meta?.skeleton === 'pill') {
    return <span className="sa-skel sa-skel--pill" style={{ width: pillWidth(row, index) }} />;
  }
  if (meta?.align === 'right') {
    return <div className="sa-skel-cell r">{line}</div>;
  }
  return line;
}

type SkeletonRowsProps<TData extends RowData> = {
  /** Visible columns, in display order. */
  columns: Column<TData, unknown>[];
  hasActions: boolean;
};

/** Loading body: rows as tall as real rows, shaped like the real cells. */
export function GridSkeletonRows<TData extends RowData>({ columns, hasActions }: SkeletonRowsProps<TData>) {
  return Array.from({ length: SKELETON_ROW_COUNT }, (_, row) => (
    <tr key={row} className="sa-skel-row" style={{ '--r': row } as CSSProperties}>
      <td className="cb">
        <span className="sa-skel sa-skel--sq" />
      </td>
      {columns.map((column, index) => {
        const { className, style } = columnCellProps(column, hasActions);
        return (
          <td key={column.id} className={className || undefined} style={style}>
            <SkeletonCell column={column} row={row} index={index} />
          </td>
        );
      })}
      {hasActions ? (
        <td className="stR">
          <span className="sa-skel sa-skel--dot" style={{ margin: 'auto' }} />
        </td>
      ) : null}
    </tr>
  ));
}

export type GridEmptyProps = {
  icon?: IconName;
  title: string;
  description: string;
  /** Usually the "Clear all filters" button. */
  action?: ReactNode;
};

/** Centred empty state; render it after the table inside a `sa-grid__scroll--empty` region. */
export function GridEmpty({ icon = 'search', title, description, action }: GridEmptyProps) {
  return (
    <div className="sa-grid__empty">
      <EmptyState icon={icon} title={title} description={description} action={action} />
    </div>
  );
}

export type GridErrorProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title: string;
  message: string;
  onRetry: () => void;
};

/** Inline alert to render above the grid; the last loaded rows stay in the grid. */
export function GridError({ title, message, onRetry, ...rest }: GridErrorProps) {
  return (
    <div className="sa-alert sa-alert--danger" role="alert" {...rest}>
      <Icon name="warn" />
      <div>
        <strong>{title}</strong> {message}{' '}
        <a
          className="sa-link"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            onRetry();
          }}
        >
          Retry
        </a>
      </div>
    </div>
  );
}
