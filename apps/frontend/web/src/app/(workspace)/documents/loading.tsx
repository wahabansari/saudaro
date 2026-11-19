import { EMPTY_GRID_QUERY } from '@/lib/grid-query';
import { DocumentsGrid } from '../../_components/grids/DocumentsGrid';
import { PageSkeleton } from '../../_components/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <DocumentsGrid rows={[]} query={EMPTY_GRID_QUERY} isLoading />
    </PageSkeleton>
  );
}
