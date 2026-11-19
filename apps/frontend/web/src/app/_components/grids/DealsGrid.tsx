'use client';

import { StatusBadge } from '@/components/ui/Badge';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import { formatAmount } from '@/lib/format';
import type { GridQuery } from '@/lib/grid-query';
import type { Deal } from '@/lib/mock/deals';
import { DEAL_STATUS_OPTIONS } from '@/lib/mock/status';
import { UrlGrid } from '../UrlGrid';
import { statusColumn } from './shared';

const columns: GridColumnDef<Deal>[] = [
  { accessorKey: 'id', header: 'Deal ref', size: 170, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'quotationId', header: 'Quotation ref', size: 170, meta: { filter: 'text' } },
  { accessorKey: 'product', header: 'Product', size: 320, meta: { filter: 'text' } },
  { accessorKey: 'counterparty', header: 'Counterparty', size: 220, meta: { filter: 'text' } },
  {
    accessorKey: 'value',
    header: 'Value (USD)',
    size: 160,
    cell: ({ row }) => formatAmount(row.original.value),
    meta: { filter: 'number', align: 'right' },
  },
  { accessorKey: 'quantity', header: 'Quantity (MT)', size: 150, meta: { filter: 'number', align: 'right' } },
  { accessorKey: 'incoterm', header: 'Incoterm', size: 170, meta: { filter: 'enum' } },
  statusColumn<Deal>({
    options: DEAL_STATUS_OPTIONS,
    valueOf: (row) => row.status,
    badge: (row) => <StatusBadge kind="deal" status={row.status} />,
  }),
  { accessorKey: 'shipmentDate', header: 'Shipment', size: 140, meta: { filter: 'date' } },
  { accessorKey: 'updated', header: 'Updated', size: 140, meta: { filter: 'date' } },
];

type DealsGridProps = { rows: Deal[]; query: GridQuery; isLoading?: boolean };

export function DealsGrid({ rows, query, isLoading }: DealsGridProps) {
  return (
    <UrlGrid
      title="Deals"
      columns={columns}
      data={rows}
      query={query}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      searchPlaceholder="Search deals"
      noResults={{
        title: 'No deals match your filters',
        description: 'Change or clear a filter to see more deals.',
      }}
      firstUse={{
        icon: 'handshake',
        title: 'No deals yet',
        description: 'A deal starts when a quotation is accepted.',
      }}
    />
  );
}
