import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuotationCard } from '@/components/ui/QuotationCard';
import { formatAmount, formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { threadFor } from '@/lib/mock/negotiation';
import { findQuotation } from '@/lib/mock/quotations';
import { labelOf, QUOTATION_STATUS_OPTIONS } from '@/lib/mock/status';
import { NegotiationPanel } from '../../../_components/NegotiationPanel';
import { WorkspacePage } from '../../../_components/WorkspacePage';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: (await params).id };
}

export default async function QuotationPage({ params }: Params) {
  const { id } = await params;
  const quotation = findQuotation(id);
  if (!quotation) notFound();

  const statusLabel = labelOf(QUOTATION_STATUS_OPTIONS, quotation.status);
  const thread = threadFor(quotation.id);

  return (
    <WorkspacePage
      breadcrumb={[{ label: 'Quotations', href: '/quotations' }]}
      currentCrumb={quotation.id}
      title={quotation.product}
      description={`${formatQuantity(quotation.quantity, quotation.unit)}, ${quotation.incoterm}. Valid until ${formatDate(quotation.validUntil)}.`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="quotation-heading" className="grid min-w-0 content-start gap-4">
          <h2 id="quotation-heading" className="text-h4">
            Quotation
          </h2>
          <QuotationCard
            reference={quotation.id}
            revision={quotation.revision}
            exporter={quotation.exporter}
            initials={quotation.exporterInitials}
            statusLabel={statusLabel}
            currency={quotation.currency}
            unitPrice={formatAmount(quotation.unitPrice)}
            unit={quotation.unit}
            quantity={formatQuantity(quotation.quantity, quotation.unit)}
            total={formatMoney(quotation.unitPrice * quotation.quantity, quotation.currency)}
            incoterm={quotation.incoterm}
            payment={quotation.payment}
            validUntil={formatDate(quotation.validUntil)}
            documentCount={quotation.documents}
          />
        </section>
        <section aria-labelledby="negotiation-heading" className="grid min-w-0 content-start gap-4">
          <h2 id="negotiation-heading" className="text-h4">
            Negotiation
          </h2>
          {thread.length > 0 ? (
            <NegotiationPanel
              reference={quotation.id}
              title={`${quotation.exporter} and ${quotation.buyer}`}
              statusLabel={statusLabel}
              items={thread}
            />
          ) : (
            <EmptyState
              icon="msg"
              title="No messages yet"
              description="Ask a question or send a counter offer to start the negotiation."
            />
          )}
        </section>
      </div>
    </WorkspacePage>
  );
}
