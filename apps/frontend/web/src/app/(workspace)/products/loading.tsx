import { EMPTY_GRID_QUERY } from '@/lib/grid-query';
import { ProductsGrid } from '../../_components/grids/ProductsGrid';
import { PageSkeleton } from '../../_components/PageSkeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <ProductsGrid rows={[]} query={EMPTY_GRID_QUERY} isLoading />
    </PageSkeleton>
  );
}
