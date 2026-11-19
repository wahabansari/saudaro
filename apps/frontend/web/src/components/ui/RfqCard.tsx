import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type RfqCardProps = ComponentProps<'div'> & {
  reference: string;
  title: string;
  buyer: string;
  status: string;
  quantity: string;
  incoterm: string;
  deadline: string;
  closes: string;
  quotations: number;
};

export function RfqCard({
  reference,
  title,
  buyer,
  status,
  quantity,
  incoterm,
  deadline,
  closes,
  quotations,
  className,
  ...rest
}: RfqCardProps) {
  const specs = [
    ['package', 'Quantity', quantity],
    ['ship', 'Incoterm', incoterm],
    ['clock', 'Deadline', deadline],
  ] as const;
  return (
    <div className={clsx('@container', className)} {...rest}>
      <article className="sa-mp @max-sm:!p-4">
        <div className="sa-mp__head">
          <div className="min-w-0">
            <span className="sa-mp__ref">{reference}</span>
            <h3 className="sa-mp__title">{title}</h3>
            <div className="sa-mp__sub" style={{ marginTop: 4 }}>
              <Icon name="building" />
              {buyer}
              <span className="sa-badge sa-badge--success" style={{ marginLeft: 4 }}>
                <Icon name="verified" />
                Verified
              </span>
            </div>
          </div>
          <span className="sa-badge sa-badge--info">
            <Icon name="info" />
            {status}
          </span>
        </div>
        <dl className="sa-spec" style={{ margin: 0 }}>
          {specs.map(([icon, label, value]) => (
            <div key={label}>
              <dt>
                <Icon name={icon} />
                {label}
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="sa-mp__foot @max-sm:!flex-col @max-sm:!items-stretch">
          <span className="sa-mp__sub">
            <span className="sa-badge sa-badge--warning">
              <Icon name="clock" />
              {closes}
            </span>
            {quotations} quotations
          </span>
          <button className="sa-btn">Send quotation</button>
        </div>
      </article>
    </div>
  );
}
