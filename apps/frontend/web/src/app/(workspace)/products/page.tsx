import type { Metadata } from 'next';
import { parseGridQuery, type RawSearchParams } from '@/lib/grid-query';
import { PRODUCTS } from '@/lib/mock/products';
import { ProductsGrid } from '../../_components/grids/ProductsGrid';
import { WorkspacePage } from '../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'Products' };

const OWN_PRODUCTS = PRODUCTS.filter((product) => product.exporterSlug === 'al-noor-foods');

export default async function ProductsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseGridQuery(await searchParams);

  return (
    <WorkspacePage
      breadcrumb={[]}
      currentCrumb="Products"
      title="Products"
      description="Products importers can find in the catalog."
    >
      <ProductsGrid rows={OWN_PRODUCTS} query={query} />
    </WorkspacePage>
  );
}
