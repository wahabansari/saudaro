import type { Metadata } from 'next';
import { parseGridQuery, type RawSearchParams } from '@/lib/grid-query';
import { DOCUMENTS } from '@/lib/mock/documents';
import { DocumentsGrid } from '../../_components/grids/DocumentsGrid';
import { WorkspacePage } from '../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'Documents' };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseGridQuery(await searchParams);

  return (
    <WorkspacePage
      breadcrumb={[]}
      currentCrumb="Documents"
      title="Documents"
      description="Certificates and sample documents for your products."
    >
      <DocumentsGrid rows={DOCUMENTS} query={query} />
    </WorkspacePage>
  );
}
