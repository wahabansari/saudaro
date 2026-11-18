import { Icon } from '@/icons';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import type { GridRowAction } from '@/components/ui/GridMenus';

export type RfqRow = {
  ref: string;
  product: string;
  hs: string;
  qty: number;
  incoterm: string;
  port: string;
  status: string;
  price: number;
  docs: number;
  buyer: string;
  deadline: string;
  updated: string;
};

const row = (
  ref: string,
  product: string,
  hs: string,
  qty: number,
  incoterm: string,
  port: string,
  status: string,
  price: number,
  docs: number,
  buyer: string,
  deadline: string,
  updated: string,
): RfqRow => ({
  ref: `RFQ-2026-${ref}`,
  product,
  hs,
  qty,
  incoterm,
  port,
  status,
  price,
  docs,
  buyer,
  deadline,
  updated,
});

/** Sample rows of the DataGrid preview, verbatim. */
export const RFQ_ROWS: RfqRow[] = [
  row(
    '0412',
    'Basmati rice 1121 Steam, 25 kg PP bags',
    '1006.30',
    1200,
    'CIF',
    'Jebel Ali, United Arab Emirates',
    'Open',
    842,
    6,
    'Al Noor Trading LLC',
    '2026-12-12',
    '2 h ago',
  ),
  row(
    '0409',
    'Cold pressed sesame oil, 5 L tins',
    '1515.50',
    48,
    'FOB',
    'Rotterdam, Netherlands',
    'Quoted',
    2310,
    4,
    'Van Dijk Foods BV',
    '2026-12-08',
    '5 h ago',
  ),
  row(
    '0405',
    'Cotton knit fabric, 180 GSM, OEKO-TEX',
    '6006.32',
    22,
    'CFR',
    'Hamburg, Germany',
    'Negotiating',
    3980,
    9,
    'Nordic Textile GmbH',
    '2026-11-30',
    'Yesterday',
  ),
  row(
    '0398',
    'Dehydrated red onion flakes, 25 kg',
    '0712.20',
    300,
    'FOB',
    'Felixstowe, United Kingdom',
    'Open',
    1420,
    3,
    'Harvest Lane Ltd',
    '2026-12-05',
    'Yesterday',
  ),
  row(
    '0391',
    'Himalayan pink salt, food grade',
    '2501.00',
    2500,
    'CIF',
    'Singapore, Singapore',
    'Awarded',
    96.5,
    7,
    'Lion City Foods Pte',
    '',
    '3 days ago',
  ),
  row(
    '0387',
    'Turmeric finger, polished, 5% curcumin',
    '0910.30',
    80,
    'CIF',
    'New York, United States',
    'Expired',
    2640,
    5,
    'Brooklyn Spice Co.',
    '2026-11-19',
    '4 days ago',
  ),
  row(
    '0380',
    'Stainless steel cutlery set, 24 pcs',
    '8215.20',
    12,
    'FOB',
    'Sydney, Australia',
    'Quoted',
    8750,
    8,
    'Harbourline Imports',
    '2026-12-20',
    '5 days ago',
  ),
  row(
    '0376',
    'Leather work gloves, cowhide, size L',
    '4203.29',
    9,
    'EXW',
    'Karachi, Pakistan',
    'Open',
    5200,
    2,
    'Sialkot Safety Gear',
    '2026-11-28',
    '6 days ago',
  ),
];

const STATUS_BADGE: Record<string, string> = {
  Open: 'info',
  Quoted: 'warning',
  Negotiating: 'neutral',
  Awarded: 'success',
  Expired: 'danger',
};

const STATUS_OPTIONS = [
  { value: 'Open', count: 92 },
  { value: 'Quoted', count: 64 },
  { value: 'Negotiating', count: 41 },
  { value: 'Awarded', count: 33 },
  { value: 'Expired', count: 18 },
];

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('');

export const RFQ_COLUMNS: GridColumnDef<RfqRow>[] = [
  { accessorKey: 'ref', header: 'RFQ ref', size: 140, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'product', header: 'Product', size: 230, meta: { filter: 'text', skeleton: 'stack' } },
  { accessorKey: 'hs', header: 'HS code', size: 110, meta: { filter: 'text' } },
  { accessorKey: 'qty', header: 'Quantity (MT)', size: 150, meta: { filter: 'number', align: 'right' } },
  { accessorKey: 'incoterm', header: 'Incoterm', size: 120, meta: { filter: 'enum' } },
  { accessorKey: 'port', header: 'Destination port', size: 190, meta: { filter: 'enum' } },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 150,
    meta: { filter: 'enum', skeleton: 'pill', options: STATUS_OPTIONS },
    cell: (info) => {
      const status = String(info.getValue());
      return <span className={`sa-badge sa-badge--${STATUS_BADGE[status] ?? 'neutral'}`}>{status}</span>;
    },
  },
  {
    accessorKey: 'price',
    header: 'Target price (USD/MT)',
    size: 190,
    meta: { filter: 'number', align: 'right' },
    cell: (info) => (info.getValue() as number).toFixed(2),
  },
  {
    accessorKey: 'docs',
    header: 'Documents',
    size: 130,
    meta: { filter: 'number', align: 'right' },
    cell: (info) => (
      <span className="sa-cell-docs">
        <Icon name="file" />
        {String(info.getValue())}
      </span>
    ),
  },
  {
    accessorKey: 'buyer',
    header: 'Buyer',
    size: 210,
    meta: { filter: 'text', skeleton: 'avatar' },
    cell: (info) => (
      <span className="sa-cell-ico">
        <span className="sa-avatar">{initials(String(info.getValue()))}</span>
        {String(info.getValue())}
      </span>
    ),
  },
  { accessorKey: 'deadline', header: 'Deadline', size: 130, meta: { filter: 'date' } },
  { accessorKey: 'updated', header: 'Updated', size: 130, meta: { filter: 'text' } },
];

export const rowActions = (): GridRowAction[] => [
  { label: 'View RFQ', icon: 'eye', onSelect: () => undefined },
  { label: 'Send quotation', icon: 'send', onSelect: () => undefined },
  { label: 'Duplicate', icon: 'copy', onSelect: () => undefined },
  { label: 'Download documents', icon: 'upload', onSelect: () => undefined },
  { label: 'Delete RFQ', icon: 'trash', onSelect: () => undefined, isDanger: true },
];
