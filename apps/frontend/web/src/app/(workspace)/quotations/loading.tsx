import { EMPTY_GRID_QUERY } from '@/lib/grid-query';
import { QuotationsGrid } from '../../_components/grids/QuotationsGrid';
import { PageSkeleton } from '../../_components/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <QuotationsGrid rows={[]} query={EMPTY_GRID_QUERY} isLoading />
    </PageSkeleton>
  );
}
