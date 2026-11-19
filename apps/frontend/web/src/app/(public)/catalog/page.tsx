import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import type { RawSearchParams } from '@/lib/grid-query';
import { EXPORTERS } from '@/lib/mock/exporters';
import { PRODUCTS } from '@/lib/mock/products';
import { LinkedExporterCard, LinkedProductCard } from '../../_components/LinkedCards';

export const metadata: Metadata = { title: 'Catalog' };

const CONTAINER = 'mx-auto w-full max-w-container px-4 md:px-6';
const CARD_GRID = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function searchText(raw: RawSearchParams) {
  const value = raw.q;
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = searchText(await searchParams);
  const needle = query.toLowerCase();
  const products = PRODUCTS.filter(
    (product) =>
      product.status === 'published' &&
      [product.name, product.category, product.hsCode].some((field) => field.toLowerCase().includes(needle)),
  );

  return (
    <>
      <section aria-labelledby="catalog-heading" className="py-16 md:py-20 lg:py-24">
        <div className={CONTAINER}>
          <h1 id="catalog-heading" className="text-h1">
            Catalog
          </h1>
          <p className="mb-8 mt-2 max-w-content text-body-lg text-ground-muted">Find verified exporters.</p>
          <form action="/catalog" role="search" className="mb-8 flex items-end gap-3">
            <div className="max-w-content flex-1">
              <Input label="Search products" name="q" icon="search" defaultValue={query} />
            </div>
            <Button type="submit">Search</Button>
          </form>
          {products.length > 0 ? (
            <div className={CARD_GRID}>
              {products.map((product) => (
                <LinkedProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title="No products match your search"
              description="Check the spelling or clear the search to see every product."
              action={
                <Button asChild variant="secondary">
                  <Link href="/catalog">Clear all filters</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>
      <section
        id="exporters"
        aria-labelledby="exporters-heading"
        className="bg-chrome py-16 md:py-20 lg:py-24"
      >
        <div className={CONTAINER}>
          <h2 id="exporters-heading" className="mb-8 text-h2">
            Exporters
          </h2>
          <div className={CARD_GRID}>
            {EXPORTERS.map((exporter) => (
              <LinkedExporterCard key={exporter.slug} exporter={exporter} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
