import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type PageLoaderProps = ComponentProps<'div'> & {
  label?: string;
  inline?: boolean;
};

export function PageLoader({ label = 'Loading', inline, className, ...props }: PageLoaderProps) {
  return (
    <div
      className={clsx('sa-pl @container', inline && 'sa-pl--inline', className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <svg className="sa-pl__mark" viewBox="0 0 64 64" width="72" height="72" role="img" aria-label="Loading">
        <defs>
          <mask id="sa-plm" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <rect width="64" height="64" fill="#fff" />
            <g fill="#000" stroke="#000" strokeWidth="1.6" strokeLinejoin="round">
              <path className="a1" d="M0 17.5H36V13L51.5 21L36 29V24.5H0Z" />
              <path className="a2" d="M64 39.5H28V35L12.5 43L28 51V46.5H64Z" />
            </g>
          </mask>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="15" fill="var(--action)" mask="url(#sa-plm)" />
      </svg>
      <div className="sa-pl__bar" aria-hidden="true" />
      <div className="sa-pl__txt">
        {label}
        <i>.</i>
        <i>.</i>
        <i>.</i>
      </div>
    </div>
  );
}
