import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type ExporterCardProps = Omit<ComponentProps<'article'>, 'children'> & {
  name: string;
  /** Two-letter monogram for the square avatar. */
  initials: string;
  /** Preformatted location, for example "Lahore, Pakistan". */
  location: string;
  verifiedLevels: number;
  categories: readonly string[];
  /** Preformatted, for example "8 / 8". */
  documentsReady: string;
  /** Documents ready as a percentage, 0 to 100. */
  documentsReadyPercent: number;
  /** Preformatted, for example "1.8 d". */
  replyTime: string;
  completedDeals: number;
  onViewProfile?: () => void;
  onRequestQuotation?: () => void;
};

export function ExporterCard({
  name,
  initials,
  location,
  verifiedLevels,
  categories,
  documentsReady,
  documentsReadyPercent,
  replyTime,
  completedDeals,
  onViewProfile,
  onRequestQuotation,
  className,
  ...rest
}: ExporterCardProps) {
  return (
    <article className={clsx('sa-mp', className)} style={{ padding: 20 }} {...rest}>
      <div className="sa-mp__head">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="sa-avatar sa-avatar--sq sa-avatar--lg">{initials}</span>
          <div>
            <h3 className="sa-mp__title" style={{ margin: 0 }}>
              {name}
            </h3>
            <div className="sa-mp__sub">
              <Icon name="pin" size={20} />
              {location}
            </div>
          </div>
        </div>
        <span className="sa-badge sa-badge--success">
          <Icon name="verified" size={20} />
          {`Verified · ${verifiedLevels} ${verifiedLevels === 1 ? 'level' : 'levels'}`}
        </span>
      </div>
      <div className="sa-mp__row">
        {categories.map((category) => (
          <span key={category} className="sa-tag">
            {category}
          </span>
        ))}
      </div>
      <div className="sa-stats3">
        <div>
          <b>{documentsReady}</b>
          <span>Documents ready</span>
        </div>
        <div>
          <b>{replyTime}</b>
          <span>Reply time</span>
        </div>
        <div>
          <b>{completedDeals}</b>
          <span>Completed deals</span>
        </div>
      </div>
      <div
        className="sa-progress"
        role="progressbar"
        aria-label="Standard documents ready"
        aria-valuenow={documentsReadyPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="sa-progress__bar" style={{ width: `${documentsReadyPercent}%` }} />
      </div>
      <div className="sa-mp__foot">
        <button
          type="button"
          className="sa-btn sa-btn--secondary"
          style={{ flex: 1 }}
          onClick={onViewProfile}
        >
          View profile
        </button>
        <button type="button" className="sa-btn" style={{ flex: 1 }} onClick={onRequestQuotation}>
          <Icon name="send" size={20} />
          Request quotation
        </button>
      </div>
    </article>
  );
}
