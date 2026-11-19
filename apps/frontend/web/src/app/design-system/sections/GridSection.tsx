'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/icons';
import { DataGrid } from '@/components/ui/DataGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { GridError } from '@/components/ui/GridStates';
import type { GridFilters } from '@/components/ui/DataGrid.types';
import { RFQ_COLUMNS, RFQ_ROWS, rowActions, type RfqRow } from './GridSection.data';
import { FilterPanels, GridMenusStatic } from './GridSection.static';

const TOTAL_ROWS = 248;
const ACTIVE_FILTERS: GridFilters = {
  status: { type: 'enum', values: ['Open', 'Quoted'] },
  incoterm: { type: 'enum', values: ['CIF'] },
};
const SELECTED = { 'RFQ-2026-0409': true, 'RFQ-2026-0405': true };

const secondary = 'sa-btn sa-btn--secondary sa-btn--sm';

type DemoProps = {
  maxHeight: string;
  data?: RfqRow[];
  initialFilters?: GridFilters;
  isLoading?: boolean;
  isBulk?: boolean;
  openFilterId?: string;
  portalContainer?: HTMLElement | null;
};

/** A controlled grid with the sample rows of the preview. */
function GridDemo({
  maxHeight,
  data = RFQ_ROWS,
  initialFilters = {},
  isLoading,
  isBulk,
  openFilterId,
  portalContainer,
}: DemoProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  return (
    <DataGrid
      title="RFQs"
      columns={RFQ_COLUMNS}
      data={data}
      getRowId={(rfq) => rfq.ref}
      rowCount={TOTAL_ROWS}
      filters={filters}
      onFiltersChange={setFilters}
      search={search}
      onSearchChange={setSearch}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      isLoading={isLoading}
      maxHeight={maxHeight}
      searchPlaceholder="Search ref, product, buyer"
      rowActions={rowActions}
      defaultRowSelection={isBulk ? SELECTED : undefined}
      openFilterId={openFilterId}
      onOpenFilterChange={openFilterId ? () => undefined : undefined}
      portalContainer={portalContainer}
      noResults={{
        title: 'No RFQs match these filters',
        description: 'Try a different status or clear the search to see all 248 RFQs.',
      }}
      toolbarActions={
        <>
          <button type="button" className={secondary}>
            <Icon name="export" />
            Export
          </button>
          <button type="button" className="sa-btn sa-btn--sm">
            <Icon name="plus" />
            New RFQ
          </button>
        </>
      }
      bulkActions={() => (
        <>
          <button type="button" className={secondary}>
            <Icon name="export" />
            Export
          </button>
          <button type="button" className={secondary}>
            <Icon name="archive" />
            Archive
          </button>
          <button type="button" className="sa-btn sa-btn--danger-soft sa-btn--sm">
            <Icon name="trash" />
            Delete
          </button>
        </>
      )}
    />
  );
}

function DsSection({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section id={`ds-${name}`} aria-labelledby={`ds-${name}-h`}>
      <h3 id={`ds-${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}

export function GridSection() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <DsSection name="DataGrid">
        <div ref={setContainer} style={{ minHeight: 640 }}>
          <GridDemo
            maxHeight="440px"
            initialFilters={ACTIVE_FILTERS}
            isBulk
            openFilterId="status"
            portalContainer={container}
          />
        </div>
      </DsSection>
      <DsSection name="FilterDropdown">
        <FilterPanels />
      </DsSection>
      <DsSection name="GridMenus">
        <GridMenusStatic />
      </DsSection>
      <DsSection name="GridStates">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 20 }}>
          <GridError
            title="Could not load RFQs."
            message="Check your connection and try again."
            onRetry={() => undefined}
          />
          <GridDemo maxHeight="320px" isLoading />
          <GridDemo maxHeight="300px" data={[]} initialFilters={ACTIVE_FILTERS} />
        </div>
      </DsSection>
      <DsSection name="EmptyState">
        <EmptyState
          style={{ maxWidth: 560 }}
          icon="file"
          title="No sample documents yet"
          description="Upload certificates, spec sheets and sample invoices so importers can review them before they ask for a quotation."
          action={
            <button type="button" className="sa-btn">
              <Icon name="upload" />
              Upload documents
            </button>
          }
          link={
            <a className="sa-link" href="#">
              How documents are shared
            </a>
          }
        />
      </DsSection>
    </>
  );
}
