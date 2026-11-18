import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export type DocumentTileState = 'valid' | 'sample' | 'expired' | 'restricted';

export type DocumentTileProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Full file name, truncated visually and kept whole in the title. */
  name: string;
  href: string;
  /** Type icon in the 40px tile; ignored when restricted (always a lock). */
  icon: IconName;
  state: DocumentTileState;
  /** Document type label, for example "Certificate". */
  type: string;
  /** Preformatted size, for example "1.2 MB". */
  size: string;
  /** Last part of the sub line: a date, "Sample" or the restriction note. */
  detail: string;
  /** Accessible subject of the actions, for example "ISO 22000 certificate". */
  label: string;
  /** File format used in the download label, for example "PDF". */
  format: string;
  onPreview?: () => void;
  /** Renders the real download link; omit for expired or restricted files. */
  downloadHref?: string;
  onVerify?: () => void;
};

const STATUS = {
  valid: { tone: 'success', icon: 'ok', text: 'Valid' },
  sample: { tone: 'info', icon: 'info', text: 'Sample' },
  expired: { tone: 'warning', icon: 'warn', text: 'Expired' },
  restricted: { tone: 'neutral', icon: 'lock', text: 'Restricted' },
} as const;

export function DocumentTile({
  name,
  href,
  icon,
  state,
  type,
  size,
  detail,
  label,
  format,
  onPreview,
  downloadHref,
  onVerify,
  className,
  ...rest
}: DocumentTileProps) {
  const status = STATUS[state];
  const locked = state === 'restricted';
  return (
    <div className={clsx('sa-doc', locked && 'sa-doc--locked', className)} {...rest}>
      <span className="sa-doc__icon">
        <Icon name={locked ? 'lock' : icon} size={20} />
      </span>
      <span className="sa-doc__meta">
        <a
          className="sa-doc__name"
          href={href}
          title={name}
          style={{ color: 'var(--ink)', textDecoration: 'none' }}
        >
          {name}
        </a>
        <span className="sa-doc__sub">{`${type} · ${size} · ${detail}`}</span>
      </span>
      <span className={`sa-badge sa-badge--${status.tone}`}>
        <Icon name={status.icon} size={20} />
        {status.text}
      </span>
      <span className="sa-doc__act">
        {locked ? (
          <button type="button" className="sa-btn sa-btn--secondary sa-btn--sm" onClick={onVerify}>
            Verify to view
          </button>
        ) : (
          <>
            {onPreview ? (
              <button
                type="button"
                className="sa-iconbtn"
                aria-label={`Preview ${label}`}
                onClick={onPreview}
              >
                <Icon name="eye" size={20} />
              </button>
            ) : null}
            {downloadHref ? (
              <a
                className="sa-iconbtn"
                href={downloadHref}
                download
                aria-label={`Download ${label}, ${format}, ${size}`}
              >
                <Icon name="download" size={20} />
              </a>
            ) : null}
          </>
        )}
      </span>
    </div>
  );
}
