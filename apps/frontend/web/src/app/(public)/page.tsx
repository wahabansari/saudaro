import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PRODUCTS } from '@/lib/mock/products';
import { LinkedProductCard } from '../_components/LinkedCards';

const CONTAINER = 'mx-auto w-full max-w-container px-4 md:px-6';
const FEATURED_PRODUCTS = PRODUCTS.filter((product) => product.status === 'published').slice(0, 3);

export default function HomePage() {
  return (
    <>
      <section data-theme="navy" className="bg-ground py-16 text-ground-text md:py-20 lg:py-24">
        <div className={`${CONTAINER} grid gap-6`}>
          <h1 className="text-display-lg">Trade with proof.</h1>
          <p className="max-w-content text-body-lg">
            Find verified exporters, request quotations and negotiate with every document in one place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="inverse" size="lg">
              <Link href="/rfqs/new">Post an RFQ</Link>
            </Button>
            <Button asChild variant="inverse-outline" size="lg">
              <Link href="/catalog">Find verified exporters</Link>
            </Button>
          </div>
        </div>
      </section>
      <section aria-labelledby="featured-heading" className="py-16 md:py-20 lg:py-24">
        <div className={CONTAINER}>
          <h2 id="featured-heading" className="mb-8 text-h2">
            Every certificate, before you ask.
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_PRODUCTS.map((product) => (
              <LinkedProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
