'use client';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import { Icon, type IconName } from '@/icons';
import { formatFileSize } from '@/lib/format';
import type { GridQuery } from '@/lib/grid-query';
import type { TradeDocument } from '@/lib/mock/documents';
import { DOCUMENT_STATE_OPTIONS, type DocumentState } from '@/lib/mock/status';
import { UrlGrid } from '../UrlGrid';
import { statusColumn } from './shared';

const STATE_BADGE: Record<DocumentState, { tone: BadgeTone; icon: IconName; label: string }> = {
  valid: { tone: 'success', icon: 'ok', label: 'Valid' },
  sample: { tone: 'info', icon: 'info', label: 'Sample' },
  expired: { tone: 'warning', icon: 'warn', label: 'Expired' },
  restricted: { tone: 'neutral', icon: 'lock', label: 'Restricted' },
};

const columns: GridColumnDef<TradeDocument>[] = [
  { accessorKey: 'id', header: 'Document ref', size: 160, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'name', header: 'File name', size: 320, meta: { filter: 'text' } },
  { accessorKey: 'type', header: 'Type', size: 190, meta: { filter: 'enum' } },
  { accessorKey: 'owner', header: 'Attached to', size: 260, meta: { filter: 'text' } },
  {
    accessorKey: 'sizeKb',
    header: 'Size (KB)',
    size: 130,
    cell: ({ row }) => formatFileSize(row.original.sizeKb),
    meta: { filter: 'number', align: 'right' },
  },
  statusColumn<TradeDocument>({
    options: DOCUMENT_STATE_OPTIONS,
    valueOf: (row) => row.state,
    badge: (row) => {
      const { tone, icon, label } = STATE_BADGE[row.state];
      return (
        <Badge tone={tone} icon={icon}>
          {label}
        </Badge>
      );
    },
  }),
  { accessorKey: 'uploaded', header: 'Uploaded', size: 140, meta: { filter: 'date' } },
  { accessorKey: 'expires', header: 'Expires', size: 140, meta: { filter: 'date' } },
];

type DocumentsGridProps = { rows: TradeDocument[]; query: GridQuery; isLoading?: boolean };

export function DocumentsGrid({ rows, query, isLoading }: DocumentsGridProps) {
  return (
    <UrlGrid
      title="Documents"
      columns={columns}
      data={rows}
      query={query}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      searchPlaceholder="Search documents"
      toolbarActions={
        <Button size="sm">
          <Icon name="upload" size={16} />
          Upload documents
        </Button>
      }
      noResults={{
        title: 'No documents match your filters',
        description: 'Change or clear a filter to see more documents.',
      }}
      firstUse={{
        icon: 'folder',
        title: 'No sample documents yet',
        description:
          'Upload certificates, spec sheets and sample invoices so importers can review them before they ask for a quotation.',
        action: <Button size="sm">Upload documents</Button>,
      }}
    />
  );
}
