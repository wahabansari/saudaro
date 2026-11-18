'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/icons';
import { formatNumber } from './DataGrid.filters';
import { GridSelect } from './GridSelect';

type ToolbarProps = {
  title: string;
  total: number;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
  /** Columns picker, density and the caller's actions. */
  children?: ReactNode;
};

export function GridToolbar({
  title,
  total,
  search,
  onSearchChange,
  searchPlaceholder,
  children,
}: ToolbarProps) {
  return (
    <div className="sa-grid__bar">
      <h3>{title}</h3>
      <span className="sa-badge sa-badge--neutral">{formatNumber(total)}</span>
      <div className="sa-search">
        <Icon name="search" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          aria-label={`Search ${title}`}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <span className="sa-grow" />
      {children}
    </div>
  );
}

type BulkBarProps = { count: number; onClear: () => void; children?: ReactNode };

export function GridBulkBar({ count, onClear, children }: BulkBarProps) {
  return (
    <div className="sa-bulk" role="region" aria-label="Bulk actions">
      <label className="sa-check" aria-label="Clear selection">
        <input type="checkbox" checked onChange={onClear} />
        <span className="sa-check__box">
          <Icon name="check" />
        </span>
      </label>
      {count} selected
      <span className="sa-grow" />
      {children}
      <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}

export type GridChip = { id: string; label: string; text: string; onRemove: () => void };

type ChipsProps = { chips: GridChip[]; onClearAll: () => void };

export function GridChips({ chips, onClearAll }: ChipsProps) {
  return (
    <div className="sa-grid__chips">
      <span>Filters</span>
      {chips.map((chip) => (
        <span key={chip.id} className="sa-fchip">
          {chip.text}
          <button type="button" aria-label={`Remove ${chip.label} filter`} onClick={chip.onRemove}>
            <Icon name="x" />
          </button>
        </span>
      ))}
      <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}

const PAGE_WINDOW = 3;

/** First page, a window around the current one, last page; `null` marks a gap. */
function pageItems(page: number, pageCount: number): (number | null)[] {
  const start = Math.min(Math.max(1, page - 1), Math.max(1, pageCount - PAGE_WINDOW + 1));
  const end = Math.min(pageCount, start + PAGE_WINDOW - 1);
  const items: (number | null)[] = [];
  if (start > 1) items.push(1, ...(start > 2 ? [null] : []));
  for (let item = start; item <= end; item += 1) items.push(item);
  if (end < pageCount) items.push(...(end < pageCount - 1 ? [null] : []), pageCount);
  return items;
}

type FooterProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Rows shown on this page. */
  count: number;
  pageSizeOptions: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function PageLink({
  onSelect,
  isDisabled = false,
  children,
  ...rest
}: {
  onSelect: () => void;
  isDisabled?: boolean;
  children: ReactNode;
  'aria-label'?: string;
  'aria-current'?: 'page';
}) {
  return (
    <a
      className="sa-page"
      href="#"
      aria-disabled={isDisabled || undefined}
      onClick={(event) => {
        event.preventDefault();
        if (!isDisabled) onSelect();
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function GridFooter({
  page,
  pageSize,
  total,
  count,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: FooterProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = first === 0 ? 0 : first + count - 1;

  return (
    <div className="sa-grid__foot">
      <div className="sa-pp">
        Rows per page
        <GridSelect
          aria-label="Rows per page"
          side="top"
          value={String(pageSize)}
          options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        />
      </div>
      <span className="sa-grow" />
      <span>
        {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}
      </span>
      <nav aria-label="Pagination" style={{ display: 'flex', gap: 4 }}>
        <PageLink aria-label="Previous page" isDisabled={page <= 1} onSelect={() => onPageChange(page - 1)}>
          <Icon name="chevron-left" />
        </PageLink>
        {pageItems(page, pageCount).map((item, index) =>
          item === null ? (
            <span key={`gap-${index}`} className="sa-page" style={{ border: 0 }}>
              …
            </span>
          ) : (
            <PageLink
              key={item}
              aria-current={item === page ? 'page' : undefined}
              onSelect={() => onPageChange(item)}
            >
              {item}
            </PageLink>
          ),
        )}
        <PageLink
          aria-label="Next page"
          isDisabled={page >= pageCount}
          onSelect={() => onPageChange(page + 1)}
        >
          <Icon name="chevron-right" />
        </PageLink>
      </nav>
    </div>
  );
}
