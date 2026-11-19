import type { Metadata } from 'next';
import { parseGridQuery, type RawSearchParams } from '@/lib/grid-query';
import { RFQS } from '@/lib/mock/rfqs';
import { RfqsGrid } from '../../_components/grids/RfqsGrid';
import { WorkspacePage } from '../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'RFQs' };

export default async function RfqsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseGridQuery(await searchParams);

  return (
    <WorkspacePage
      breadcrumb={[]}
      currentCrumb="RFQs"
      title="RFQs"
      description="Requests for quotation from importers."
    >
      <RfqsGrid rows={RFQS} query={query} />
    </WorkspacePage>
  );
}
