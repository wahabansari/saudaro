'use client';

import { useRouter } from 'next/navigation';
import { ExporterCard } from '@/components/ui/ExporterCard';
import { ProductCard } from '@/components/ui/ProductCard';
import { RfqCard, type RfqCardProps } from '@/components/ui/RfqCard';
import { EXPORTERS, type Exporter } from '@/lib/mock/exporters';
import type { Product } from '@/lib/mock/products';

export function LinkedExporterCard({ exporter }: { exporter: Exporter }) {
  const router = useRouter();
  const profileHref = `/exporters/${exporter.slug}`;

  return (
    <ExporterCard
      name={exporter.name}
      initials={exporter.initials}
      location={exporter.location}
      verifiedLevels={exporter.verifiedLevels}
      categories={exporter.categories}
      documentsReady={`${exporter.documentsReady} / ${exporter.documentsTotal}`}
      documentsReadyPercent={Math.round((exporter.documentsReady / exporter.documentsTotal) * 100)}
      replyTime={exporter.replyTime}
      completedDeals={exporter.completedDeals}
      onViewProfile={() => router.push(profileHref)}
      onRequestQuotation={() => router.push('/rfqs/new')}
    />
  );
}

export function LinkedProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const exporter = EXPORTERS.find((entry) => entry.slug === product.exporterSlug);

  return (
    <ProductCard
      title={product.name}
      exporter={exporter?.name ?? ''}
      location={exporter?.location ?? ''}
      priceFrom={product.priceFrom.toLocaleString('en-US')}
      currency={product.currency}
      unit={product.moqUnit}
      moq={`MOQ ${product.moq} ${product.moqUnit}`}
      incoterm={`${product.incoterm} ${product.port}`}
      documentCount={product.documents}
      exporterVerified={(exporter?.verifiedLevels ?? 0) > 0}
      onViewDocuments={() => router.push(`/exporters/${product.exporterSlug}#documents`)}
    />
  );
}

export function LinkedRfqCard(props: Omit<RfqCardProps, 'onAction'>) {
  const router = useRouter();
  return <RfqCard {...props} onAction={() => router.push('/quotations')} />;
}
