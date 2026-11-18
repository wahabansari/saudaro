import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type QuotationCardProps = Omit<ComponentProps<'article'>, 'children'> & {
  /** Reference such as "QT-2026-0412". */
  reference: string;
  revision?: number;
  exporter: string;
  initials: string;
  /** Status word from the enum, for example "Under negotiation". */
  statusLabel: string;
  currency: string;
  /** Preformatted unit price, for example "1,240.00". */
  unitPrice: string;
  unit: string;
  /** Preformatted quantity, for example "250 MT". */
  quantity: string;
  /** Preformatted total with currency, for example "USD 310,000.00". */
  total: string;
  incoterm: string;
  payment: string;
  /** Preformatted date, for example "30 Nov 2026". */
  validUntil: string;
  documentCount: number;
  onAccept?: () => void;
  onCounter?: () => void;
  onAsk?: () => void;
};

export function QuotationCard({
  reference,
  revision,
  exporter,
  initials,
  statusLabel,
  currency,
  unitPrice,
  unit,
  quantity,
  total,
  incoterm,
  payment,
  validUntil,
  documentCount,
  onAccept,
  onCounter,
  onAsk,
  className,
  ...rest
}: QuotationCardProps) {
  return (
    <article className={clsx('sa-mp', className)} {...rest}>
      <div className="sa-mp__head">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="sa-avatar sa-avatar--sq">{initials}</span>
          <div>
            <span className="sa-mp__ref">{revision ? `${reference} · Revision ${revision}` : reference}</span>
            <h3 className="sa-mp__title" style={{ margin: 0 }}>
              {exporter}
            </h3>
          </div>
        </div>
        <span className="sa-badge sa-badge--warning">
          <Icon name="warn" size={20} />
          {statusLabel}
        </span>
      </div>
      <div>
        <div className="sa-price">
          <span className="sa-price__cur">{currency}</span>
          <span className="sa-price__amt">{unitPrice}</span>
          <span className="sa-price__unit">{`/ ${unit}`}</span>
        </div>
        <div className="sa-mp__sub" style={{ marginTop: 2 }}>
          {`Total for ${quantity}: `}
          <b style={{ color: 'var(--ink)', fontWeight: 600, marginLeft: 4 }}>{total}</b>
        </div>
      </div>
      <dl
        className="sa-kv"
        style={{ margin: 0, padding: '14px 0', borderBlock: '1px solid var(--grey-200)' }}
      >
        <dt>Incoterm</dt>
        <dd>{incoterm}</dd>
        <dt>Payment</dt>
        <dd>{payment}</dd>
        <dt>Valid until</dt>
        <dd>{validUntil}</dd>
        <dt>Documents</dt>
        <dd>{`${documentCount} attached`}</dd>
      </dl>
      <div className="sa-mp__row" style={{ gap: 8 }}>
        <button type="button" className="sa-btn" onClick={onAccept}>
          Accept quotation
        </button>
        <button type="button" className="sa-btn sa-btn--secondary" onClick={onCounter}>
          Counter offer
        </button>
        <button type="button" className="sa-btn sa-btn--text" onClick={onAsk}>
          <Icon name="msg" size={20} />
          Ask a question
        </button>
      </div>
    </article>
  );
}
