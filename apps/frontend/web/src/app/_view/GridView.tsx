'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/icons';
import { DataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import type { FilterValue, GridFilters } from '@/components/ui/dataGridFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterDropdown, type FilterDropdownProps } from '@/components/ui/FilterDropdown';
import { ColumnMenu, ColumnPicker, RowActionsMenu } from '@/components/ui/GridMenus';
import { GridError } from '@/components/ui/GridStates';

type Rfq = Record<
  'ref' | 'product' | 'hs' | 'incoterm' | 'port' | 'status' | 'buyer' | 'deadline' | 'updated',
  string
> &
  Record<'qty' | 'price' | 'docs', number>;

const rows: Rfq[] = (
  [
    [
      'RFQ-2026-0412',
      'Basmati rice 1121 Steam, 25 kg PP bags',
      '1006.30',
      1200,
      'CIF',
      'Jebel Ali, United Arab Emirates',
      'Open',
      842,
      6,
      'Al Noor Trading LLC',
      '12 Dec 2026',
      '2 h ago',
    ],
    [
      'RFQ-2026-0409',
      'Cold pressed sesame oil, 5 L tins',
      '1515.50',
      48,
      'FOB',
      'Rotterdam, Netherlands',
      'Quoted',
      2310,
      4,
      'Van Dijk Foods BV',
      '08 Dec 2026',
      '5 h ago',
    ],
    [
      'RFQ-2026-0405',
      'Cotton knit fabric, 180 GSM, OEKO-TEX',
      '6006.32',
      22,
      'CFR',
      'Hamburg, Germany',
      'Negotiating',
      3980,
      9,
      'Nordic Textile GmbH',
      '30 Nov 2026',
      'Yesterday',
    ],
    [
      'RFQ-2026-0398',
      'Dehydrated red onion flakes, 25 kg',
      '0712.20',
      300,
      'FOB',
      'Felixstowe, United Kingdom',
      'Open',
      1420,
      3,
      'Harvest Lane Ltd',
      '05 Dec 2026',
      'Yesterday',
    ],
    [
      'RFQ-2026-0391',
      'Himalayan pink salt, food grade',
      '2501.00',
      2500,
      'CIF',
      'Singapore, Singapore',
      'Awarded',
      96.5,
      7,
      'Lion City Foods Pte',
      '—',
      '3 days ago',
    ],
    [
      'RFQ-2026-0387',
      'Turmeric finger, polished, 5% curcumin',
      '0910.30',
      80,
      'CIF',
      'New York, United States',
      'Expired',
      2640,
      5,
      'Brooklyn Spice Co.',
      '19 Nov 2026',
      '4 days ago',
    ],
    [
      'RFQ-2026-0380',
      'Stainless steel cutlery set, 24 pcs',
      '8215.20',
      12,
      'FOB',
      'Sydney, Australia',
      'Quoted',
      8750,
      8,
      'Harbourline Imports',
      '20 Dec 2026',
      '5 days ago',
    ],
    [
      'RFQ-2026-0376',
      'Leather work gloves, cowhide, size L',
      '4203.29',
      9,
      'EXW',
      'Karachi, Pakistan',
      'Open',
      5200,
      2,
      'Sialkot Safety Gear',
      '28 Nov 2026',
      '6 days ago',
    ],
  ] as const
).map(([ref, product, hs, qty, incoterm, port, status, price, docs, buyer, deadline, updated]) => ({
  ref,
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
}));

const tone: Record<string, string> = {
  Open: 'info',
  Quoted: 'warning',
  Negotiating: 'neutral',
  Awarded: 'success',
  Expired: 'danger',
};
const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

const columns: ColumnDef<Rfq>[] = [
  { accessorKey: 'ref', header: 'RFQ ref', size: 140, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'product', header: 'Product', size: 230, meta: { filter: 'text' } },
  { accessorKey: 'hs', header: 'HS code', size: 110, meta: { filter: 'text' } },
  {
    accessorKey: 'qty',
    header: 'Quantity (MT)',
    size: 150,
    cell: (c) => c.row.original.qty.toLocaleString('en-US'),
    meta: { filter: 'number', align: 'right' },
  },
  { accessorKey: 'incoterm', header: 'Incoterm', size: 120, meta: { filter: 'enum' } },
  { accessorKey: 'port', header: 'Destination port', size: 190, meta: { filter: 'enum' } },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 150,
    cell: (c) => (
      <span className={`sa-badge sa-badge--${tone[c.row.original.status]}`}>{c.row.original.status}</span>
    ),
    meta: { filter: 'enum' },
  },
  {
    accessorKey: 'price',
    header: 'Target price (USD/MT)',
    size: 190,
    cell: (c) => c.row.original.price.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    meta: { filter: 'number', align: 'right' },
  },
  {
    accessorKey: 'docs',
    header: 'Documents',
    size: 130,
    cell: (c) => (
      <span className="sa-cell-docs">
        <Icon name="file" />
        {c.row.original.docs}
      </span>
    ),
    meta: { filter: 'number', align: 'right' },
  },
  {
    accessorKey: 'buyer',
    header: 'Buyer',
    size: 210,
    cell: (c) => (
      <span className="sa-cell-ico">
        <span className="sa-avatar">{initials(c.row.original.buyer)}</span>
        {c.row.original.buyer}
      </span>
    ),
    meta: { filter: 'text' },
  },
  { accessorKey: 'deadline', header: 'Deadline', size: 130, meta: { filter: 'date' } },
  { accessorKey: 'updated', header: 'Updated', size: 130, meta: { filter: 'text' } },
];

const noop = () => undefined;
const button = (
  label: string,
  icon: 'download' | 'plus' | 'archive' | 'trash',
  variant = 'sa-btn--secondary',
) => (
  <button type="button" className={`sa-btn ${variant} sa-btn--sm`}>
    <Icon name={icon} />
    {label}
  </button>
);

const rowActions = () => [
  { label: 'View RFQ', icon: 'eye' as const, onSelect: noop },
  { label: 'Send quotation', icon: 'send' as const, onSelect: noop },
  { label: 'Duplicate', icon: 'copy' as const, onSelect: noop },
  { label: 'Download documents', icon: 'download' as const, onSelect: noop },
  { label: 'Delete RFQ', icon: 'trash' as const, onSelect: noop, danger: true },
];

const gridProps = {
  title: 'RFQs',
  columns,
  data: rows,
  getRowId: (row: Rfq) => row.ref,
  searchPlaceholder: 'Search ref, product, buyer',
  empty: {
    title: 'No RFQs match these filters',
    description: `Try a different status or clear the search to see all ${rows.length} RFQs.`,
  },
  rowActions,
  actions: (
    <>
      {button('Export', 'download')}
      {button('New RFQ', 'plus', '')}
    </>
  ),
  bulkActions: () => (
    <>
      {button('Export', 'download')}
      {button('Archive', 'archive')}
      {button('Delete', 'trash', 'sa-btn--danger-soft')}
    </>
  ),
};

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section id={name} aria-labelledby={`${name}-h`}>
      <h3 id={`${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}

const ports = [
  { value: 'Hamburg, Germany', count: 12 },
  { value: 'Hamilton, Canada', count: 3 },
  { value: 'Ho Chi Minh, Vietnam', count: 0 },
];

const filterDemos: Omit<FilterDropdownProps, 'value' | 'onChange'>[] = [
  { label: 'Product', kind: 'text' },
  { label: 'Destination port', kind: 'enum', options: ports },
  { label: 'Quantity (MT)', kind: 'number', range: [0, 2500] },
  { label: 'Deadline', kind: 'date' },
];

function FilterDemo(props: Omit<FilterDropdownProps, 'value' | 'onChange'>) {
  const [value, setValue] = useState<FilterValue>();
  return (
    <div className="sa-th w-[200px]">
      <span className="sa-th__label">{props.label}</span>
      <FilterDropdown {...props} value={value} onChange={setValue} />
    </div>
  );
}

export function GridView() {
  const [filters, setFilters] = useState<GridFilters>([]);
  const [noMatch, setNoMatch] = useState<GridFilters>([
    { id: 'status', value: ['Awarded'] },
    { id: 'incoterm', value: ['EXW'] },
  ]);
  return (
    <>
      <Section name="DataGrid">
        <DataGrid
          {...gridProps}
          defaultSelected={['RFQ-2026-0409', 'RFQ-2026-0405']}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </Section>
      <Section name="FilterDropdown">
        <div className="flex flex-wrap gap-6">
          {filterDemos.map((demo) => (
            <FilterDemo key={demo.label} {...demo} />
          ))}
        </div>
      </Section>
      <Section name="GridMenus">
        <div className="flex flex-wrap items-start gap-6">
          <ColumnMenu label="Status" onFilter={noop} onPin={noop} onHide={noop}>
            <button
              type="button"
              className="sa-btn sa-btn--secondary sa-btn--sm data-[state=closed]:![animation:none]"
            >
              Status
            </button>
          </ColumnMenu>
          <ColumnPicker
            columns={columns.map((c, i) => ({
              id: String(c.header),
              label: String(c.header),
              visible: i !== 4,
              locked: i === 0,
            }))}
            onToggle={noop}
            onReset={noop}
          />
          <RowActionsMenu label="Row actions for RFQ-2026-0412" actions={rowActions()} />
        </div>
      </Section>
      <Section name="GridStates">
        <div className="grid gap-5">
          <GridError title="Could not load RFQs." onRetry={noop}>
            Check your connection and try again.
          </GridError>
          <DataGrid {...gridProps} loading height={320} />
          <DataGrid {...gridProps} height={300} filters={noMatch} onFiltersChange={setNoMatch} />
        </div>
      </Section>
      <Section name="EmptyState">
        <EmptyState
          icon="file"
          title="No sample documents yet"
          description="Upload certificates, spec sheets and sample invoices so importers can review them before they ask for a quotation."
          className="max-w-[560px]"
        >
          <button type="button" className="sa-btn">
            <Icon name="upload" />
            Upload documents
          </button>
          <a className="sa-link" href="#">
            How documents are shared
          </a>
        </EmptyState>
      </Section>
    </>
  );
}
