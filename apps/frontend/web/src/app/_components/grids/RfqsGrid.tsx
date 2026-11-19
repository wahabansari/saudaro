'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import { Icon } from '@/icons';
import { formatAmount } from '@/lib/format';
import type { GridQuery } from '@/lib/grid-query';
import type { Rfq } from '@/lib/mock/rfqs';
import { RFQ_STATUS_OPTIONS } from '@/lib/mock/status';
import { UrlGrid } from '../UrlGrid';
import { statusColumn } from './shared';

const columns: GridColumnDef<Rfq>[] = [
  { accessorKey: 'id', header: 'RFQ ref', size: 170, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'product', header: 'Product', size: 320, meta: { filter: 'text' } },
  { accessorKey: 'hsCode', header: 'HS code', size: 120, meta: { filter: 'text' } },
  { accessorKey: 'quantity', header: 'Quantity (MT)', size: 150, meta: { filter: 'number', align: 'right' } },
  { accessorKey: 'incoterm', header: 'Incoterm', size: 120, meta: { filter: 'enum' } },
  { accessorKey: 'destination', header: 'Destination port', size: 260, meta: { filter: 'text' } },
  statusColumn<Rfq>({
    options: RFQ_STATUS_OPTIONS,
    valueOf: (row) => row.status,
    badge: (row) => <StatusBadge kind="rfq" status={row.status} />,
  }),
  {
    accessorKey: 'targetPrice',
    header: 'Target price (USD/MT)',
    size: 200,
    cell: ({ row }) => (row.original.targetPrice === null ? '—' : formatAmount(row.original.targetPrice)),
    meta: { filter: 'number', align: 'right' },
  },
  { accessorKey: 'quotations', header: 'Quotations', size: 130, meta: { filter: 'number', align: 'right' } },
  { accessorKey: 'buyer', header: 'Buyer', size: 220, meta: { filter: 'text' } },
  { accessorKey: 'deadline', header: 'Deadline', size: 140, meta: { filter: 'date' } },
  { accessorKey: 'updated', header: 'Updated', size: 140, meta: { filter: 'date' } },
];

type RfqsGridProps = { rows: Rfq[]; query: GridQuery; isLoading?: boolean };

export function RfqsGrid({ rows, query, isLoading }: RfqsGridProps) {
  const router = useRouter();
  const postAction = (
    <Button asChild size="sm">
      <Link href="/rfqs/new">
        <Icon name="plus" size={16} />
        Post an RFQ
      </Link>
    </Button>
  );

  return (
    <UrlGrid
      title="RFQs"
      columns={columns}
      data={rows}
      query={query}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      searchPlaceholder="Search RFQs"
      toolbarActions={postAction}
      rowActions={(row) => [
        { label: 'View RFQ', icon: 'eye', onSelect: () => router.push(`/rfqs/${row.id}`) },
      ]}
      noResults={{
        title: 'No RFQs match your filters',
        description: 'Change or clear a filter to see more RFQs.',
      }}
      firstUse={{
        icon: 'clipboard',
        title: 'No RFQs yet',
        description: 'Post an RFQ and exporters send quotations here.',
        action: postAction,
      }}
    />
  );
}
