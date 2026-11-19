import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

const tones = { success: 'ok', info: 'info', warning: 'warn', neutral: 'lock' } as const;

export type DocumentTileProps = ComponentProps<'div'> & {
  icon: IconName;
  name: string;
  href?: string;
  meta: string;
  status: string;
  tone?: keyof typeof tones;
  locked?: boolean;
  previewLabel?: string;
  downloadHref?: string;
  downloadLabel?: string;
};

export function DocumentTile({
  icon,
  name,
  href = '#',
  meta,
  status,
  tone = 'success',
  locked,
  previewLabel,
  downloadHref,
  downloadLabel,
  className,
  ...rest
}: DocumentTileProps) {
  return (
    <div className={clsx('@container', className)} {...rest}>
      <div
        className={clsx(
          'sa-doc',
          locked && 'sa-doc--locked',
          '@max-sm:!grid-cols-[auto_minmax(0,1fr)] @max-sm:[&>.sa-badge]:!col-start-2 @max-sm:[&>.sa-badge]:!justify-self-start @max-sm:[&>.sa-doc__act]:!col-start-2',
        )}
      >
        <span className="sa-doc__icon">
          <Icon name={locked ? 'lock' : icon} />
        </span>
        <span className="sa-doc__meta">
          <a className="sa-doc__name" href={href} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
            {name}
          </a>
          <span className="sa-doc__sub">{meta}</span>
        </span>
        <span className={clsx('sa-badge', `sa-badge--${locked ? 'neutral' : tone}`)}>
          <Icon name={locked ? 'lock' : tones[tone]} />
          {status}
        </span>
        <span className="sa-doc__act">
          {locked ? (
            <button className="sa-btn sa-btn--secondary sa-btn--sm">Verify to view</button>
          ) : (
            <>
              {previewLabel && (
                <button className="sa-iconbtn" aria-label={previewLabel}>
                  <Icon name="eye" />
                </button>
              )}
              {downloadHref && (
                <a className="sa-iconbtn" href={downloadHref} download aria-label={downloadLabel}>
                  <Icon name="download" />
                </a>
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
