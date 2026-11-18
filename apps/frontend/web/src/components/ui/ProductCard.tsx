import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type ProductCardProps = Omit<ComponentProps<'article'>, 'children'> & {
  title: string;
  /** Exporter company name. */
  exporter: string;
  /** Preformatted, for example "Lahore, Pakistan". */
  location: string;
  /** Preformatted amount without currency, for example "1,180". */
  priceFrom: string;
  currency: string;
  unit: string;
  /** Preformatted, for example "MOQ 25 MT". */
  moq: string;
  /** Preformatted, for example "FOB Karachi". */
  incoterm: string;
  documentCount: number;
  exporterVerified?: boolean;
  saved?: boolean;
  onViewDocuments?: () => void;
  onToggleSaved?: () => void;
};

export function ProductCard({
  title,
  exporter,
  location,
  priceFrom,
  currency,
  unit,
  moq,
  incoterm,
  documentCount,
  exporterVerified = false,
  saved = false,
  onViewDocuments,
  onToggleSaved,
  className,
  ...rest
}: ProductCardProps) {
  return (
    <article className={clsx('sa-mp', className)} style={{ padding: 16 }} {...rest}>
      <div className="sa-pmedia">
        <Icon name="package" size={20} />
        {exporterVerified ? (
          <span className="sa-badge sa-badge--success">
            <Icon name="verified" size={20} />
            Verified exporter
          </span>
        ) : null}
      </div>
      <div>
        <h3 className="sa-mp__title">{title}</h3>
        <div className="sa-mp__sub" style={{ marginTop: 4 }}>
          <Icon name="factory" size={20} />
          {`${exporter} · ${location}`}
        </div>
      </div>
      <div className="sa-price">
        <span className="sa-price__cur">{`From ${currency}`}</span>
        <span className="sa-price__amt">{priceFrom}</span>
        <span className="sa-price__unit">{`/ ${unit}`}</span>
      </div>
      <div className="sa-mp__row">
        <span className="sa-badge sa-badge--outline">{moq}</span>
        <span className="sa-badge sa-badge--outline">{incoterm}</span>
        <span className="sa-badge sa-badge--info">
          <Icon name="file" size={20} />
          {`${documentCount} ${documentCount === 1 ? 'document' : 'documents'}`}
        </span>
      </div>
      <div className="sa-mp__foot">
        <button type="button" className="sa-btn" style={{ flex: 1 }} onClick={onViewDocuments}>
          View documents
        </button>
        <button
          type="button"
          className="sa-iconbtn"
          aria-label="Save product"
          aria-pressed={saved}
          onClick={onToggleSaved}
        >
          <Icon name="heart" size={20} />
        </button>
      </div>
    </article>
  );
}
