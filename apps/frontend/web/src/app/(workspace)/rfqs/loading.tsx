import { EMPTY_GRID_QUERY } from '@/lib/grid-query';
import { RfqsGrid } from '../../_components/grids/RfqsGrid';
import { PageSkeleton } from '../../_components/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <RfqsGrid rows={[]} query={EMPTY_GRID_QUERY} isLoading />
    </PageSkeleton>
  );
}
