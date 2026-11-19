import type { ReactNode } from 'react';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import { labelOf, type EnumOption } from '@/lib/mock/status';

type StatusColumnConfig<TData> = {
  options: EnumOption[];
  valueOf: (row: TData) => string;
  badge: (row: TData) => ReactNode;
  header?: string;
  size?: number;
};

/** The filter and the cell title use the status word; the badge is drawn from the row. */
export function statusColumn<TData>({
  options,
  valueOf,
  badge,
  header = 'Status',
  size = 180,
}: StatusColumnConfig<TData>): GridColumnDef<TData> {
  return {
    id: 'status',
    header,
    size,
    accessorFn: (row) => labelOf(options, valueOf(row)),
    cell: ({ row }) => badge(row.original),
    meta: { filter: 'enum', skeleton: 'pill' },
  };
}
