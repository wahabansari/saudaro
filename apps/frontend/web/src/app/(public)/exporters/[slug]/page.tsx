import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { DocumentTile } from '@/components/ui/DocumentTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { Statistic } from '@/components/ui/Statistic';
import { VerificationBadge, VerificationList } from '@/components/ui/VerificationBadge';
import { formatFileSize } from '@/lib/format';
import { DOCUMENT_ICONS, documentsOf, type TradeDocument } from '@/lib/mock/documents';
import { findExporter } from '@/lib/mock/exporters';
import { publishedProductsOf } from '@/lib/mock/products';
import { LinkedProductCard } from '../../../_components/LinkedCards';

type Params = { params: Promise<{ slug: string }> };

const CONTAINER = 'mx-auto w-full max-w-container px-4 md:px-6';

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const exporter = findExporter((await params).slug);
  return { title: exporter?.name ?? 'Exporter' };
}

function groupByType(documents: TradeDocument[]) {
  const groups = new Map<string, TradeDocument[]>();
  for (const document of documents) {
    groups.set(document.type, [...(groups.get(document.type) ?? []), document]);
  }
  return [...groups];
}

export default async function ExporterPage({ params }: Params) {
  const exporter = findExporter((await params).slug);
  if (!exporter) notFound();

  const products = publishedProductsOf(exporter.slug);
  const documentGroups = groupByType(documentsOf(exporter.slug));

  return (
    <div className={`${CONTAINER} grid gap-12 py-16 md:py-20 lg:py-24`}>
      <header className="grid gap-4">
        <Breadcrumb items={[{ label: 'Catalog', href: '/catalog' }]} current={exporter.name} />
        <h1 className="text-h1">{exporter.name}</h1>
        <p className="text-body-lg text-ground-muted">{exporter.location}</p>
        <div>
          <VerificationBadge variant="summary" levels={exporter.verifiedLevels} />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Statistic
            label="Documents ready"
            value={`${exporter.documentsReady} / ${exporter.documentsTotal}`}
          />
          <Statistic label="Reply time" value={exporter.replyTime} />
          <Statistic label="Completed deals" value={exporter.completedDeals} />
        </div>
      </header>
      <section aria-labelledby="verification-heading" className="grid gap-4">
        <h2 id="verification-heading" className="text-h3">
          Verification
        </h2>
        <VerificationList items={exporter.verification} />
      </section>
      <section id="documents" aria-labelledby="documents-heading" className="grid gap-6">
        <h2 id="documents-heading" className="text-h3">
          Documents
        </h2>
        {documentGroups.length === 0 ? (
          <EmptyState
            icon="folder"
            title="No sample documents yet"
            description="This exporter has not added documents."
          />
        ) : null}
        {documentGroups.map(([type, documents]) => (
          <div key={type} className="grid gap-3">
            <h3 className="text-h5">{type}</h3>
            {documents.map((document) => (
              <DocumentTile
                key={document.id}
                name={document.name}
                href="#documents"
                icon={DOCUMENT_ICONS[document.type] ?? 'file'}
                state={document.state}
                type={document.type}
                size={formatFileSize(document.sizeKb)}
                detail={document.note}
                label={`${document.type} ${document.name}`}
                format={document.format}
              />
            ))}
          </div>
        ))}
      </section>
      <section aria-labelledby="products-heading" className="grid gap-6">
        <h2 id="products-heading" className="text-h3">
          Products
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <LinkedProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
