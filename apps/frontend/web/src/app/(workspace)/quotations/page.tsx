import type { Metadata } from 'next';
import { parseGridQuery, type RawSearchParams } from '@/lib/grid-query';
import { DEALS } from '@/lib/mock/deals';
import { QUOTATIONS } from '@/lib/mock/quotations';
import { DealsGrid } from '../../_components/grids/DealsGrid';
import { QuotationsGrid } from '../../_components/grids/QuotationsGrid';
import { UrlTabs } from '../../_components/UrlTabs';
import { WorkspacePage } from '../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'Quotations' };

const TABS = [
  { value: 'quotations', label: 'Quotations' },
  { value: 'deals', label: 'Deals' },
];

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const query = parseGridQuery(raw);
  const tab = raw.tab === 'deals' ? 'deals' : 'quotations';

  return (
    <WorkspacePage
      breadcrumb={[]}
      currentCrumb="Quotations"
      title="Quotations"
      description="Quotations you send and the deals that follow."
    >
      <UrlTabs value={tab} tabs={TABS}>
        {tab === 'deals' ? (
          <DealsGrid rows={DEALS} query={query} />
        ) : (
          <QuotationsGrid rows={QUOTATIONS} query={query} />
        )}
      </UrlTabs>
    </WorkspacePage>
  );
}
