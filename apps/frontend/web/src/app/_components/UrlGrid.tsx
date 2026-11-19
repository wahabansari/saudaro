'use client';

import { useEffect, useState } from 'react';
import type { RowData } from '@tanstack/react-table';
import { DataGrid, type DataGridProps } from '@/components/ui/DataGrid';
import { mergeGridQuery, PAGE_SIZES, type GridQuery } from '@/lib/grid-query';

type QueryProps =
  | 'filters'
  | 'onFiltersChange'
  | 'search'
  | 'onSearchChange'
  | 'page'
  | 'pageSize'
  | 'onPageChange'
  | 'onPageSizeChange'
  | 'pageSizeOptions';

export type UrlGridProps<TData extends RowData> = Omit<DataGridProps<TData>, QueryProps> & {
  /** Query parsed from the URL by the page. */
  query: GridQuery;
};

function mirrorToUrl(query: GridQuery) {
  const search = mergeGridQuery(window.location.search, query);
  const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', url);
}

/** A DataGrid whose filters, search and paging live in the URL search params. */
export function UrlGrid<TData extends RowData>({ query: initialQuery, ...props }: UrlGridProps<TData>) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => mirrorToUrl(query), [query]);

  const update = (patch: Partial<GridQuery>) => setQuery((current) => ({ ...current, ...patch }));

  return (
    <DataGrid
      {...props}
      filters={query.filters}
      onFiltersChange={(filters) => update({ filters })}
      search={query.search}
      onSearchChange={(search) => update({ search })}
      page={query.page}
      pageSize={query.pageSize}
      onPageChange={(page) => update({ page })}
      onPageSizeChange={(pageSize) => update({ pageSize })}
      pageSizeOptions={PAGE_SIZES}
    />
  );
}
