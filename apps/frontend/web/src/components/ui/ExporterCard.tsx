import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type ExporterCardProps = ComponentProps<'div'> & {
  initials: string;
  name: string;
  location: string;
  verification: string;
  tags: string[];
  stats: [value: string, label: string][];
  readiness: number;
};

export function ExporterCard({
  initials,
  name,
  location,
  verification,
  tags,
  stats,
  readiness,
  className,
  ...rest
}: ExporterCardProps) {
  return (
    <div className={clsx('@container', className)} {...rest}>
      <article className="sa-mp @max-sm:!p-4" style={{ padding: 20 }}>
        <div className="sa-mp__head">
          <div className="flex min-w-0 items-center gap-3">
            <span className="sa-avatar sa-avatar--sq sa-avatar--lg">{initials}</span>
            <div className="min-w-0">
              <h3 className="sa-mp__title truncate" style={{ margin: 0 }}>
                {name}
              </h3>
              <div className="sa-mp__sub">
                <Icon name="pin" />
                {location}
              </div>
            </div>
          </div>
          <span className="sa-badge sa-badge--success">
            <Icon name="verified" />
            {verification}
          </span>
        </div>
        <div className="sa-mp__row">
          {tags.map((tag) => (
            <span key={tag} className="sa-tag">
              {tag}
            </span>
          ))}
        </div>
        <div className="sa-stats3">
          {stats.map(([value, label]) => (
            <div key={label}>
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div
          className="sa-progress"
          role="progressbar"
          aria-label="Standard documents ready"
          aria-valuenow={readiness}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="sa-progress__bar" style={{ width: `${readiness}%` }} />
        </div>
        <div className="sa-mp__foot @max-sm:!flex-col @max-sm:!items-stretch">
          <button className="sa-btn sa-btn--secondary flex-1">View profile</button>
          <button className="sa-btn flex-1">
            <Icon name="send" />
            Request quotation
          </button>
        </div>
      </article>
    </div>
  );
}
