'use client';

import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import type { GridQuery } from '@/lib/grid-query';
import type { AuditEvent } from '@/lib/mock/audit';
import { UrlGrid } from '../UrlGrid';

const columns: GridColumnDef<AuditEvent>[] = [
  { accessorKey: 'id', header: 'Event ref', size: 150, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'date', header: 'Date', size: 140, meta: { filter: 'date' } },
  { accessorKey: 'time', header: 'Time', size: 100, meta: { filter: 'text' } },
  { accessorKey: 'actor', header: 'Actor', size: 200, meta: { filter: 'enum', skeleton: 'avatar' } },
  { accessorKey: 'action', header: 'Action', size: 200, meta: { filter: 'enum' } },
  { accessorKey: 'object', header: 'Object', size: 170, meta: { filter: 'text' } },
  { accessorKey: 'detail', header: 'Detail', size: 320, meta: { filter: 'text' } },
];

type AuditGridProps = { rows: AuditEvent[]; query: GridQuery; isLoading?: boolean };

export function AuditGrid({ rows, query, isLoading }: AuditGridProps) {
  return (
    <UrlGrid
      title="Audit log"
      columns={columns}
      data={rows}
      query={query}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      searchPlaceholder="Search audit log"
      noResults={{
        title: 'No events match your filters',
        description: 'Change or clear a filter to see more events.',
      }}
      firstUse={{
        icon: 'clock',
        title: 'No events yet',
        description: 'Changes made by you and your team appear here.',
      }}
    />
  );
}
