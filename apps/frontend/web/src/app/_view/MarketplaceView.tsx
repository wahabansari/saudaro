import { DocumentTile } from '@/components/ui/DocumentTile';
import { ExporterCard } from '@/components/ui/ExporterCard';
import { NegotiationThread } from '@/components/ui/NegotiationThread';
import { ProductCard } from '@/components/ui/ProductCard';
import { QuotationCard } from '@/components/ui/QuotationCard';
import { RfqCard } from '@/components/ui/RfqCard';
import { VerificationBadge, VerificationList } from '@/components/ui/VerificationBadge';

export function MarketplaceView() {
  return (
    <>
      <section id="DocumentTile" aria-labelledby="DocumentTile-h">
        <h3 id="DocumentTile-h" className="text-h4">
          DocumentTile
        </h3>
        <div data-ds-component="DocumentTile">
          <div className="sa-docs grid-cols-1">
            <DocumentTile
              icon="certificate"
              name="ISO-22000-certificate-2026.pdf"
              meta="Certificate · 1.2 MB · 14 Mar 2026"
              status="Valid"
              previewLabel="Preview ISO 22000 certificate"
              downloadHref="#"
              downloadLabel="Download ISO 22000 certificate, PDF, 1.2 MB"
            />
            <DocumentTile
              icon="receipt"
              name="Commercial-invoice-sample.pdf"
              meta="Commercial invoice · 240 KB · Sample"
              status="Sample"
              tone="info"
              previewLabel="Preview commercial invoice sample"
              downloadHref="#"
              downloadLabel="Download commercial invoice sample, PDF, 240 KB"
            />
            <DocumentTile
              icon="lock"
              locked
              name="Bill-of-lading-template.pdf"
              meta="Bill of lading · 310 KB · Visible to verified importers"
              status="Restricted"
            />
            <DocumentTile
              icon="clipboard"
              name="Phytosanitary-2025.pdf"
              meta="Certificate · 880 KB · Expired 01 Jan 2026"
              status="Expired"
              tone="warning"
              previewLabel="Preview phytosanitary certificate"
            />
          </div>
        </div>
      </section>
      <section id="ExporterCard" aria-labelledby="ExporterCard-h">
        <h3 id="ExporterCard-h" className="text-h4">
          ExporterCard
        </h3>
        <div data-ds-component="ExporterCard">
          <ExporterCard
            initials="AN"
            name="Al Noor Foods"
            location="Lahore, Pakistan"
            verification="Verified · 4 levels"
            tags={['Rice', 'Spices', 'Halal', 'ISO 22000']}
            stats={[
              ['8 / 8', 'Documents ready'],
              ['1.8 d', 'Reply time'],
              ['42', 'Completed deals'],
            ]}
            readiness={100}
          />
        </div>
      </section>
      <section id="NegotiationThread" aria-labelledby="NegotiationThread-h">
        <h3 id="NegotiationThread-h" className="text-h4">
          NegotiationThread
        </h3>
        <div data-ds-component="NegotiationThread">
          <NegotiationThread
            reference="QT-2026-0412"
            title="Al Noor Foods and Gulf Foods"
            status="Under negotiation"
            items={[
              { type: 'day', text: '14 Nov 2026' },
              {
                type: 'message',
                text: 'Can you do USD 1,190 for 300 MT if we take FOB Karachi?',
                meta: 'Gulf Foods · 10:42',
              },
              {
                type: 'offer',
                me: true,
                rows: [
                  ['Price per MT', 'USD 1,240.00', 'USD 1,215.00'],
                  ['Quantity', '250 MT', '300 MT'],
                ],
                meta: 'You · 11:05',
              },
              {
                type: 'message',
                me: true,
                text: 'Revised offer attached. Certificates are in the product documents.',
                meta: 'You · 11:06',
              },
              { type: 'event', text: 'Revision 2 submitted' },
            ]}
          />
        </div>
      </section>
      <section id="QuotationCard" aria-labelledby="QuotationCard-h">
        <h3 id="QuotationCard-h" className="text-h4">
          QuotationCard
        </h3>
        <div data-ds-component="QuotationCard">
          <QuotationCard
            reference="QT-2026-0412 · Revision 2"
            initials="AN"
            company="Al Noor Foods"
            status="Under negotiation"
            currency="USD"
            price="1,240.00"
            unit="/ MT"
            totalLabel="Total for 250 MT"
            total="USD 310,000.00"
            terms={[
              ['Incoterm', 'FOB Karachi'],
              ['Payment', '30% advance, 70% on B/L copy'],
              ['Valid until', '30 Nov 2026'],
              ['Documents', '6 attached'],
            ]}
          />
        </div>
      </section>
      <section id="RfqCard" aria-labelledby="RfqCard-h">
        <h3 id="RfqCard-h" className="text-h4">
          RfqCard
        </h3>
        <div data-ds-component="RfqCard">
          <RfqCard
            reference="RFQ-2026-00418"
            title="Basmati rice, 500 MT, bi-monthly"
            buyer="Gulf Foods Trading"
            status="Published"
            quantity="500 MT"
            incoterm="CIF Jebel Ali"
            deadline="30 Nov 2026"
            closes="Closes in 2 days"
            quotations={7}
          />
        </div>
      </section>
      <section id="VerificationBadge" aria-labelledby="VerificationBadge-h">
        <h3 id="VerificationBadge-h" className="text-h4">
          VerificationBadge
        </h3>
        <div data-ds-component="VerificationBadge">
          <div className="sa-mp" style={{ padding: 16, gap: 14 }}>
            <div className="sa-mp__row">
              <VerificationBadge>Verified · 4 levels</VerificationBadge>
              <VerificationBadge variant="level">Business registration</VerificationBadge>
              <VerificationBadge variant="pending">Pending review</VerificationBadge>
            </div>
            <VerificationList
              items={[
                { title: 'Email and phone', detail: 'Confirmed 02 Feb 2026', done: true },
                {
                  title: 'Business registration',
                  detail: 'Checked against registry · 10 Feb 2026',
                  done: true,
                },
                { title: 'Business address', detail: 'Confirmed 14 Feb 2026', done: true },
                { title: 'Independent check', detail: 'Not requested' },
              ]}
            />
          </div>
        </div>
      </section>
      <section id="ProductCard" aria-labelledby="ProductCard-h">
        <h3 id="ProductCard-h" className="text-h4">
          ProductCard
        </h3>
        <div data-ds-component="ProductCard">
          <ProductCard
            title="Basmati Rice 1121 Steam"
            seller="Al Noor Foods · Lahore, Pakistan"
            currency="From USD"
            amount="1,180"
            unit="/ MT"
            moq="MOQ 25 MT"
            incoterm="FOB Karachi"
            documents={8}
          />
        </div>
      </section>
    </>
  );
}
