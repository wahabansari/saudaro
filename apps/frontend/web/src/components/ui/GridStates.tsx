import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/icons';
import { EmptyState } from './EmptyState';

export type SkeletonColumn = { sticky?: 'left' | 'right'; align?: 'right' };

function SkeletonCell({ column, r, c }: { column: SkeletonColumn; r: number; c: number }) {
  const bar = (
    <span className="sa-skel sa-skel--line" style={{ width: `${40 + ((r * 17 + c * 29) % 45)}%` }} />
  );
  if (column.sticky === 'left') return <td className="st1">{bar}</td>;
  return <td>{column.align === 'right' ? <div className="sa-skel-cell r">{bar}</div> : bar}</td>;
}

export type GridSkeletonProps = { columns: SkeletonColumn[]; withActions?: boolean; rows?: number };

export function GridSkeleton({ columns, withActions, rows = 7 }: GridSkeletonProps) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="sa-skel-row" style={{ '--r': r } as CSSProperties}>
          <td className="cb">
            <span className="sa-skel sa-skel--sq" />
          </td>
          {columns.map((column, c) => (
            <SkeletonCell key={c} column={column} r={r} c={c} />
          ))}
          {withActions && (
            <td className="stR">
              <span className="sa-skel sa-skel--dot m-auto" />
            </td>
          )}
        </tr>
      ))}
    </tbody>
  );
}

export type GridEmptyProps = { title: string; description: string; onClear?: () => void };

export function GridEmpty({ title, description, onClear }: GridEmptyProps) {
  return (
    <div className="sa-grid__empty">
      <EmptyState icon="search" title={title} description={description}>
        {onClear && (
          <button type="button" className="sa-btn sa-btn--secondary sa-btn--sm" onClick={onClear}>
            Clear all filters
          </button>
        )}
      </EmptyState>
    </div>
  );
}

export type GridErrorProps = { title: string; children: ReactNode; onRetry: () => void };

export function GridError({ title, children, onRetry }: GridErrorProps) {
  return (
    <div className="sa-alert sa-alert--danger" role="alert">
      <Icon name="alert" />
      <div>
        <strong>{title}</strong> {children}{' '}
        <button type="button" className="sa-link border-0 bg-transparent p-0" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
