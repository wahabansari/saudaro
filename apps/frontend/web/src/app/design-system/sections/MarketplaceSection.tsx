'use client';

import { DocumentTile } from '@/components/ui/DocumentTile';
import { ExporterCard } from '@/components/ui/ExporterCard';
import { NegotiationThread, type NegotiationItem } from '@/components/ui/NegotiationThread';
import { ProductCard } from '@/components/ui/ProductCard';
import { QuotationCard } from '@/components/ui/QuotationCard';
import { RfqCard } from '@/components/ui/RfqCard';
import { VerificationBadge, VerificationList } from '@/components/ui/VerificationBadge';

const noop = () => undefined;

const THREAD_ITEMS: readonly NegotiationItem[] = [
  { kind: 'day', id: 'day', label: '14 Nov 2026' },
  {
    kind: 'message',
    id: 'm1',
    text: 'Can you do USD 1,190 for 300 MT if we take FOB Karachi?',
    author: 'Gulf Foods',
    time: '10:42',
  },
  {
    kind: 'offer',
    id: 'offer',
    mine: true,
    title: 'Counter offer',
    author: 'You',
    time: '11:05',
    changes: [
      { label: 'Price per MT', before: 'USD 1,240.00', after: 'USD 1,215.00' },
      { label: 'Quantity', before: '250 MT', after: '300 MT' },
    ],
  },
  {
    kind: 'message',
    id: 'm2',
    mine: true,
    text: 'Revised offer attached. Certificates are in the product documents.',
    author: 'You',
    time: '11:06',
  },
  { kind: 'event', id: 'event', text: 'Revision 2 submitted' },
];

type EntryProps = { name: string; children: React.ReactNode };

function Entry({ name, children }: EntryProps) {
  return (
    <section id={`ds-${name}`} aria-labelledby={`ds-${name}-h`}>
      <h3 id={`ds-${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}

export function MarketplaceSection() {
  return (
    <>
      <Entry name="DocumentTile">
        <div className="sa-docs">
          <DocumentTile
            name="ISO-22000-certificate-2026.pdf"
            href="#"
            icon="certificate"
            state="valid"
            type="Certificate"
            size="1.2 MB"
            detail="14 Mar 2026"
            label="ISO 22000 certificate"
            format="PDF"
            onPreview={noop}
            downloadHref="#"
          />
          <DocumentTile
            name="Commercial-invoice-sample.pdf"
            href="#"
            icon="receipt"
            state="sample"
            type="Commercial invoice"
            size="240 KB"
            detail="Sample"
            label="commercial invoice sample"
            format="PDF"
            onPreview={noop}
            downloadHref="#"
          />
          <DocumentTile
            name="Bill-of-lading-template.pdf"
            href="#"
            icon="receipt"
            state="restricted"
            type="Bill of lading"
            size="310 KB"
            detail="Visible to verified importers"
            label="bill of lading template"
            format="PDF"
            onVerify={noop}
          />
          <DocumentTile
            name="Phytosanitary-2025.pdf"
            href="#"
            icon="clipboard"
            state="expired"
            type="Certificate"
            size="880 KB"
            detail="Expired 01 Jan 2026"
            label="phytosanitary certificate"
            format="PDF"
            onPreview={noop}
          />
        </div>
      </Entry>

      <Entry name="ExporterCard">
        <ExporterCard
          name="Al Noor Foods"
          initials="AN"
          location="Lahore, Pakistan"
          verifiedLevels={4}
          categories={['Rice', 'Spices', 'Halal', 'ISO 22000']}
          documentsReady="8 / 8"
          documentsReadyPercent={100}
          replyTime="1.8 d"
          completedDeals={42}
          onViewProfile={noop}
          onRequestQuotation={noop}
        />
      </Entry>

      <Entry name="NegotiationThread">
        <NegotiationThread
          reference="QT-2026-0412"
          title="Al Noor Foods and Gulf Foods"
          statusLabel="Under negotiation"
          items={THREAD_ITEMS}
          composerId="msg-x"
          onAccept={noop}
          onCounter={noop}
          onAttach={noop}
        />
      </Entry>

      <Entry name="ProductCard">
        <ProductCard
          title="Basmati Rice 1121 Steam"
          exporter="Al Noor Foods"
          location="Lahore, Pakistan"
          priceFrom="1,180"
          currency="USD"
          unit="MT"
          moq="MOQ 25 MT"
          incoterm="FOB Karachi"
          documentCount={8}
          exporterVerified
          onViewDocuments={noop}
          onToggleSaved={noop}
        />
      </Entry>

      <Entry name="QuotationCard">
        <QuotationCard
          reference="QT-2026-0412"
          revision={2}
          exporter="Al Noor Foods"
          initials="AN"
          statusLabel="Under negotiation"
          currency="USD"
          unitPrice="1,240.00"
          unit="MT"
          quantity="250 MT"
          total="USD 310,000.00"
          incoterm="FOB Karachi"
          payment="30% advance, 70% on B/L copy"
          validUntil="30 Nov 2026"
          documentCount={6}
          onAccept={noop}
          onCounter={noop}
          onAsk={noop}
        />
      </Entry>

      <Entry name="RfqCard">
        <RfqCard
          reference="RFQ-2026-00418"
          title="Basmati rice, 500 MT, bi-monthly"
          buyer="Gulf Foods Trading"
          buyerVerified
          statusLabel="Published"
          quantity="500 MT"
          incoterm="CIF Jebel Ali"
          deadline="30 Nov 2026"
          closesIn="Closes in 2 days"
          closingSoon
          quotationCount={7}
          onAction={noop}
        />
      </Entry>

      <Entry name="VerificationBadge">
        <div className="sa-mp" style={{ padding: 16, gap: 14 }}>
          <div className="sa-mp__row">
            <VerificationBadge variant="summary" levels={4} />
            <VerificationBadge variant="level" label="Business registration" />
            <VerificationBadge variant="pending" label="Pending review" />
          </div>
          <VerificationList
            items={[
              { label: 'Email and phone', detail: 'Confirmed 02 Feb 2026', granted: true },
              {
                label: 'Business registration',
                detail: 'Checked against registry · 10 Feb 2026',
                granted: true,
              },
              { label: 'Business address', detail: 'Confirmed 14 Feb 2026', granted: true },
              { label: 'Independent check', detail: 'Not requested', granted: false },
            ]}
          />
        </div>
      </Entry>
    </>
  );
}
