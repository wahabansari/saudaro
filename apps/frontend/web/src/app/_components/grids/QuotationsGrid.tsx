'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/Badge';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import { formatAmount } from '@/lib/format';
import type { GridQuery } from '@/lib/grid-query';
import type { Quotation } from '@/lib/mock/quotations';
import { QUOTATION_STATUS_OPTIONS } from '@/lib/mock/status';
import { UrlGrid } from '../UrlGrid';
import { statusColumn } from './shared';

const columns: GridColumnDef<Quotation>[] = [
  { accessorKey: 'id', header: 'Quotation ref', size: 170, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'rfqId', header: 'RFQ ref', size: 170, meta: { filter: 'text' } },
  { accessorKey: 'product', header: 'Product', size: 320, meta: { filter: 'text' } },
  { accessorKey: 'buyer', header: 'Buyer', size: 220, meta: { filter: 'text' } },
  { accessorKey: 'revision', header: 'Revision', size: 120, meta: { filter: 'number', align: 'right' } },
  {
    accessorKey: 'unitPrice',
    header: 'Price (USD/MT)',
    size: 160,
    cell: ({ row }) => formatAmount(row.original.unitPrice),
    meta: { filter: 'number', align: 'right' },
  },
  { accessorKey: 'quantity', header: 'Quantity (MT)', size: 150, meta: { filter: 'number', align: 'right' } },
  { accessorKey: 'incoterm', header: 'Incoterm', size: 170, meta: { filter: 'enum' } },
  statusColumn<Quotation>({
    options: QUOTATION_STATUS_OPTIONS,
    valueOf: (row) => row.status,
    badge: (row) => <StatusBadge kind="quotation" status={row.status} />,
    size: 220,
  }),
  { accessorKey: 'validUntil', header: 'Valid until', size: 140, meta: { filter: 'date' } },
  { accessorKey: 'updated', header: 'Updated', size: 140, meta: { filter: 'date' } },
];

type QuotationsGridProps = { rows: Quotation[]; query: GridQuery; isLoading?: boolean };

export function QuotationsGrid({ rows, query, isLoading }: QuotationsGridProps) {
  const router = useRouter();

  return (
    <UrlGrid
      title="Quotations"
      columns={columns}
      data={rows}
      query={query}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      searchPlaceholder="Search quotations"
      rowActions={(row) => [
        { label: 'View quotation', icon: 'eye', onSelect: () => router.push(`/quotations/${row.id}`) },
      ]}
      noResults={{
        title: 'No quotations match your filters',
        description: 'Change or clear a filter to see more quotations.',
      }}
      firstUse={{
        icon: 'receipt',
        title: 'No quotations yet',
        description: 'Quotations you send and receive appear here.',
      }}
    />
  );
}
