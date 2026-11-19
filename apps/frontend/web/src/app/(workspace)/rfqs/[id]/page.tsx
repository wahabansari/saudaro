import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { closesInLabel, formatDate, formatQuantity, isClosingSoon } from '@/lib/format';
import { EMPTY_GRID_QUERY } from '@/lib/grid-query';
import { quotationsForRfq } from '@/lib/mock/quotations';
import { findRfq } from '@/lib/mock/rfqs';
import { labelOf, RFQ_STATUS_OPTIONS } from '@/lib/mock/status';
import { QuotationsGrid } from '../../../_components/grids/QuotationsGrid';
import { LinkedRfqCard } from '../../../_components/LinkedCards';
import { WorkspacePage } from '../../../_components/WorkspacePage';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: (await params).id };
}

export default async function RfqPage({ params }: Params) {
  const { id } = await params;
  const rfq = findRfq(id);
  if (!rfq) notFound();

  const port = rfq.destination.split(',')[0] ?? rfq.destination;
  const quantity = formatQuantity(rfq.quantity, rfq.unit);

  return (
    <WorkspacePage
      breadcrumb={[{ label: 'RFQs', href: '/rfqs' }]}
      currentCrumb={rfq.id}
      title={rfq.product}
      description={`${quantity}, ${rfq.incoterm} ${port}. Closes ${formatDate(rfq.deadline)}.`}
      actions={
        <Button asChild>
          <Link href="/quotations">Send quotation</Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="summary-heading" className="grid content-start gap-4">
          <h2 id="summary-heading" className="text-h4">
            Summary
          </h2>
          <LinkedRfqCard
            reference={rfq.id}
            title={rfq.product}
            buyer={rfq.buyer}
            buyerVerified
            statusLabel={labelOf(RFQ_STATUS_OPTIONS, rfq.status)}
            quantity={quantity}
            incoterm={`${rfq.incoterm} ${port}`}
            deadline={formatDate(rfq.deadline)}
            closesIn={closesInLabel(rfq.deadline)}
            closingSoon={isClosingSoon(rfq.deadline)}
            quotationCount={rfq.quotations}
          />
          <h2 className="text-h4">Activity</h2>
          <Timeline>
            <TimelineItem state="done" title="RFQ published" meta={formatDate(rfq.updated)} />
            <TimelineItem state="now" title="Quotations open" meta={`${rfq.quotations} received`} />
            <TimelineItem title="Quotation deadline" meta={formatDate(rfq.deadline)} />
          </Timeline>
        </section>
        <section
          aria-labelledby="quotations-heading"
          className="grid min-w-0 content-start gap-4 lg:col-span-2"
        >
          <h2 id="quotations-heading" className="text-h4">
            Quotations
          </h2>
          <QuotationsGrid rows={quotationsForRfq(rfq.id)} query={EMPTY_GRID_QUERY} />
        </section>
      </div>
    </WorkspacePage>
  );
}
