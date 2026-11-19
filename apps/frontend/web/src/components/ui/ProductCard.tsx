import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type ProductCardProps = ComponentProps<'div'> & {
  title: string;
  seller: string;
  currency: string;
  amount: string;
  unit: string;
  moq: string;
  incoterm: string;
  documents: number;
  saved?: boolean;
};

export function ProductCard({
  title,
  seller,
  currency,
  amount,
  unit,
  moq,
  incoterm,
  documents,
  saved,
  className,
  ...rest
}: ProductCardProps) {
  return (
    <div className={clsx('@container', className)} {...rest}>
      <article className="sa-mp @max-sm:!p-3" style={{ padding: 16 }}>
        <div className="sa-pmedia">
          <Icon name="package" />
          <span className="sa-badge sa-badge--success">
            <Icon name="verified" />
            Verified exporter
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="sa-mp__title">{title}</h3>
          <div className="sa-mp__sub" style={{ marginTop: 4 }}>
            <Icon name="factory" />
            <span className="truncate">{seller}</span>
          </div>
        </div>
        <div className="sa-price">
          <span className="sa-price__cur">{currency}</span>
          <span className="sa-price__amt">{amount}</span>
          <span className="sa-price__unit">{unit}</span>
        </div>
        <div className="sa-mp__row">
          <span className="sa-badge sa-badge--outline">{moq}</span>
          <span className="sa-badge sa-badge--outline">{incoterm}</span>
          <span className="sa-badge sa-badge--info">
            <Icon name="file" />
            {documents} documents
          </span>
        </div>
        <div className="sa-mp__foot">
          <button className="sa-btn flex-1">View documents</button>
          <button className="sa-iconbtn" aria-label="Save product" aria-pressed={saved}>
            <Icon name="heart" />
          </button>
        </div>
      </article>
    </div>
  );
}
