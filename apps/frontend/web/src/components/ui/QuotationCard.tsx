import { Fragment, type ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type QuotationCardProps = ComponentProps<'div'> & {
  reference: string;
  initials: string;
  company: string;
  status: string;
  currency: string;
  price: string;
  unit: string;
  totalLabel: string;
  total: string;
  terms: [label: string, value: string][];
};

export function QuotationCard({
  reference,
  initials,
  company,
  status,
  currency,
  price,
  unit,
  totalLabel,
  total,
  terms,
  className,
  ...rest
}: QuotationCardProps) {
  return (
    <div className={clsx('@container', className)} {...rest}>
      <article className="sa-mp @max-sm:!p-4">
        <div className="sa-mp__head">
          <div className="flex min-w-0 items-center gap-3">
            <span className="sa-avatar sa-avatar--sq">{initials}</span>
            <div className="min-w-0">
              <span className="sa-mp__ref">{reference}</span>
              <h3 className="sa-mp__title truncate" style={{ margin: 0 }}>
                {company}
              </h3>
            </div>
          </div>
          <span className="sa-badge sa-badge--warning">
            <Icon name="warn" />
            {status}
          </span>
        </div>
        <div>
          <div className="sa-price">
            <span className="sa-price__cur">{currency}</span>
            <span className="sa-price__amt">{price}</span>
            <span className="sa-price__unit">{unit}</span>
          </div>
          <div className="sa-mp__sub" style={{ marginTop: 2 }}>
            {totalLabel}: <b style={{ color: 'var(--ink)', fontWeight: 600, marginLeft: 4 }}>{total}</b>
          </div>
        </div>
        <dl
          className="sa-kv"
          style={{ margin: 0, padding: '14px 0', borderBlock: '1px solid var(--grey-200)' }}
        >
          {terms.map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
        <div className="sa-mp__row" style={{ gap: 8 }}>
          <button className="sa-btn">Accept quotation</button>
          <button className="sa-btn sa-btn--secondary">Counter offer</button>
          <button className="sa-btn sa-btn--text">
            <Icon name="msg" />
            Ask a question
          </button>
        </div>
      </article>
    </div>
  );
}
