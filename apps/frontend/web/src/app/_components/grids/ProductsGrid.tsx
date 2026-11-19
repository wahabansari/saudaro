'use client';

import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import { Icon } from '@/icons';
import { formatAmount } from '@/lib/format';
import type { GridQuery } from '@/lib/grid-query';
import type { Product } from '@/lib/mock/products';
import { PRODUCT_STATUS_OPTIONS } from '@/lib/mock/status';
import { UrlGrid } from '../UrlGrid';
import { statusColumn } from './shared';

const columns: GridColumnDef<Product>[] = [
  { accessorKey: 'id', header: 'Product ref', size: 150, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'name', header: 'Product', size: 320, meta: { filter: 'text' } },
  { accessorKey: 'hsCode', header: 'HS code', size: 120, meta: { filter: 'text' } },
  { accessorKey: 'category', header: 'Category', size: 150, meta: { filter: 'enum' } },
  { accessorKey: 'moq', header: 'MOQ (MT)', size: 130, meta: { filter: 'number', align: 'right' } },
  {
    accessorKey: 'priceFrom',
    header: 'Price from (USD/MT)',
    size: 190,
    cell: ({ row }) => formatAmount(row.original.priceFrom),
    meta: { filter: 'number', align: 'right' },
  },
  { accessorKey: 'incoterm', header: 'Incoterm', size: 120, meta: { filter: 'enum' } },
  { accessorKey: 'port', header: 'Port', size: 150, meta: { filter: 'text' } },
  { accessorKey: 'documents', header: 'Documents', size: 130, meta: { filter: 'number', align: 'right' } },
  statusColumn<Product>({
    options: PRODUCT_STATUS_OPTIONS,
    valueOf: (row) => row.status,
    badge: (row) => <StatusBadge kind="rfq" status={row.status} />,
  }),
  { accessorKey: 'updated', header: 'Updated', size: 140, meta: { filter: 'date' } },
];

type ProductsGridProps = { rows: Product[]; query: GridQuery; isLoading?: boolean };

export function ProductsGrid({ rows, query, isLoading }: ProductsGridProps) {
  return (
    <UrlGrid
      title="Products"
      columns={columns}
      data={rows}
      query={query}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      searchPlaceholder="Search products"
      toolbarActions={
        <Button size="sm">
          <Icon name="plus" size={16} />
          Add product
        </Button>
      }
      noResults={{
        title: 'No products match your filters',
        description: 'Change or clear a filter to see more products.',
      }}
      firstUse={{
        icon: 'package',
        title: 'No products yet',
        description: 'Add a product with its documents so importers can find it.',
      }}
    />
  );
}
