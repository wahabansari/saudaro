'use client';

import type { ComponentProps, ReactNode } from 'react';
import * as Select from '@radix-ui/react-select';
import clsx from 'clsx';
import { Icon } from '@/icons';

export const NO_ANIMATION = 'data-[state=closed]:![animation:none]';
export const BAR_WRAP = 'h-auto flex-wrap py-3 @3xl:h-[60px] @3xl:flex-nowrap @3xl:py-0';
const PAGE_SIZES = ['10', '25', '50', '100'];

export function Check({
  label,
  children,
  ...input
}: Omit<ComponentProps<'input'>, 'type'> & { label?: string }) {
  return (
    <label className="sa-check" aria-label={label}>
      <input type="checkbox" {...input} />
      <span className="sa-check__box">
        <Icon name="check" />
      </span>
      {children}
    </label>
  );
}

export function ComboSelect({
  value,
  onValueChange,
  options,
  side = 'bottom',
  ...trigger
}: Omit<ComponentProps<'button'>, 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  side?: 'top' | 'bottom';
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger {...trigger} className={clsx('sa-combo__trigger', NO_ANIMATION)}>
        <Select.Value />
        <Icon name="chevron-down" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side={side}
          sideOffset={6}
          className="sa-combo__panel z-dropdown min-w-[var(--radix-select-trigger-width)]"
        >
          <Select.Viewport className="sa-combo__list">
            {options.map((o) => (
              <Select.Item key={o} value={o} className="sa-opt data-[highlighted]:bg-grey-100">
                <Select.ItemText>{o}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function SearchField({
  className,
  label,
  value,
  onChange,
  clearLabel,
  ...input
}: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  clearLabel: string;
  className?: string;
}) {
  return (
    <div className={clsx('sa-search', className ?? 'w-full')}>
      <Icon name="search" />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...input}
      />
      {value && (
        <button
          type="button"
          className="sa-search__clear"
          aria-label={clearLabel}
          onClick={() => onChange('')}
        >
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}

function pageItems(current: number, count: number) {
  const pages = new Set([0, count - 1, current - 1, current, current + 1, current <= 1 ? 2 : 0]);
  const sorted = [...pages].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - (sorted[i - 1] ?? 0) > 1 ? ['…', p] : [p]));
}

function PageButton({ label, ...props }: ComponentProps<'button'> & { label?: string }) {
  return <button type="button" className="sa-page disabled:opacity-50" aria-label={label} {...props} />;
}

export type GridFooterProps = {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  total: number;
  onPageSize: (size: number) => void;
  onPage: (index: number) => void;
};

export function GridFooter({ pageIndex, pageSize, pageCount, total, onPageSize, onPage }: GridFooterProps) {
  return (
    <div className="sa-grid__foot h-auto flex-wrap justify-center py-3 @md:h-[56px] @md:flex-nowrap @md:py-0">
      <div className="sa-pp">
        Rows per page
        <ComboSelect
          side="top"
          aria-label="Rows per page"
          value={String(pageSize)}
          onValueChange={(size) => onPageSize(Number(size))}
          options={PAGE_SIZES}
        />
      </div>
      <span className="sa-grow" />
      <span>
        {total === 0 ? 0 : pageIndex * pageSize + 1}–{Math.min(total, (pageIndex + 1) * pageSize)} of {total}
      </span>
      <nav aria-label="Pagination" className="flex gap-1">
        <PageButton label="Previous page" disabled={pageIndex === 0} onClick={() => onPage(pageIndex - 1)}>
          <Icon name="chevron-left" />
        </PageButton>
        {pageItems(pageIndex, pageCount).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="sa-page border-0">
              …
            </span>
          ) : (
            <PageButton
              key={p}
              aria-current={p === pageIndex ? 'page' : undefined}
              onClick={() => onPage(Number(p))}
            >
              {Number(p) + 1}
            </PageButton>
          ),
        )}
        <PageButton
          label="Next page"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPage(pageIndex + 1)}
        >
          <Icon name="chevron-right" />
        </PageButton>
      </nav>
    </div>
  );
}

export function GridBulk({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className={clsx('sa-bulk', BAR_WRAP)} role="region" aria-label="Bulk actions">
      <Check label="Clear selection" checked onChange={onClear} />
      {count} selected
      <span className="sa-grow" />
      {children}
      <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}

export type GridChipsProps = {
  chips: { id: string; label: string; text: string }[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function GridChips({ chips, onRemove, onClear }: GridChipsProps) {
  return (
    <div className="sa-grid__chips h-auto flex-wrap py-2 @md:h-12 @md:flex-nowrap @md:py-0">
      <span>Filters</span>
      {chips.map(({ id, label, text }) => (
        <span key={id} className="sa-fchip">
          {label}: {text}
          <button type="button" aria-label={`Remove ${label} filter`} onClick={() => onRemove(id)}>
            <Icon name="x" />
          </button>
        </span>
      ))}
      <button type="button" className="sa-btn sa-btn--text sa-btn--sm" onClick={onClear}>
        Clear all
      </button>
    </div>
  );
}

export function DensityButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="sa-btn sa-btn--secondary sa-btn--sm" onClick={onClick}>
      <Icon name="rows" />
      {label}
    </button>
  );
}
