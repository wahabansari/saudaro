import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type RfqCardProps = Omit<ComponentProps<'article'>, 'children'> & {
  /** Reference such as "RFQ-2026-00418". */
  reference: string;
  title: string;
  buyer: string;
  buyerVerified?: boolean;
  /** Status word from the enum, for example "Published". */
  statusLabel: string;
  /** Preformatted, for example "500 MT". */
  quantity: string;
  /** Preformatted, for example "CIF Jebel Ali". */
  incoterm: string;
  /** Preformatted date, for example "30 Nov 2026". */
  deadline: string;
  /** Closing text, for example "Closes in 2 days". */
  closesIn: string;
  /** Under 48 hours the closing badge is a warning. */
  closingSoon?: boolean;
  quotationCount: number;
  /** Owners see "View quotations" instead of "Send quotation". */
  owner?: boolean;
  onAction?: () => void;
};

export function RfqCard({
  reference,
  title,
  buyer,
  buyerVerified = false,
  statusLabel,
  quantity,
  incoterm,
  deadline,
  closesIn,
  closingSoon = false,
  quotationCount,
  owner = false,
  onAction,
  className,
  ...rest
}: RfqCardProps) {
  return (
    <article className={clsx('sa-mp', className)} {...rest}>
      <div className="sa-mp__head">
        <div>
          <span className="sa-mp__ref">{reference}</span>
          <h3 className="sa-mp__title">{title}</h3>
          <div className="sa-mp__sub" style={{ marginTop: 4 }}>
            <Icon name="building" size={20} />
            {buyer}{' '}
            {buyerVerified ? (
              <span className="sa-badge sa-badge--success" style={{ marginLeft: 4 }}>
                <Icon name="verified" size={20} />
                Verified
              </span>
            ) : null}
          </div>
        </div>
        <span className="sa-badge sa-badge--info">
          <Icon name="info" size={20} />
          {statusLabel}
        </span>
      </div>
      <dl className="sa-spec" style={{ margin: 0 }}>
        <div>
          <dt>
            <Icon name="package" size={20} />
            Quantity
          </dt>
          <dd>{quantity}</dd>
        </div>
        <div>
          <dt>
            <Icon name="ship" size={20} />
            Incoterm
          </dt>
          <dd>{incoterm}</dd>
        </div>
        <div>
          <dt>
            <Icon name="clock" size={20} />
            Deadline
          </dt>
          <dd>{deadline}</dd>
        </div>
      </dl>
      <div className="sa-mp__foot">
        <span className="sa-mp__sub">
          <span className={clsx('sa-badge', closingSoon ? 'sa-badge--warning' : 'sa-badge--neutral')}>
            <Icon name="clock" size={20} />
            {closesIn}
          </span>
          {`${quotationCount} ${quotationCount === 1 ? 'quotation' : 'quotations'}`}
        </span>
        <button type="button" className="sa-btn" onClick={onAction}>
          {owner ? 'View quotations' : 'Send quotation'}
        </button>
      </div>
    </article>
  );
}
