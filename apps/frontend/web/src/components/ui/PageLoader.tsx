'use client';

import clsx from 'clsx';
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';

const SHOW_DELAY_MS = 300;
const MIN_VISIBLE_MS = 400;

export type PageLoaderProps = ComponentProps<'div'> & {
  label: string;
  loading?: boolean;
  inline?: boolean;
};

export function PageLoader({ label, loading = true, inline = false, className, ...props }: PageLoaderProps) {
  const maskId = useId();
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (loading) {
      const showTimer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY_MS);
      return () => clearTimeout(showTimer);
    }
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
    const hideTimer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(hideTimer);
  }, [loading]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx('sa-pl', inline && 'sa-pl--inline', className)}
      {...props}
    >
      <svg className="sa-pl__mark" viewBox="0 0 64 64" width={72} height={72} role="img" aria-label="Loading">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <rect width="64" height="64" fill="white" />
            <g fill="black" stroke="black" strokeWidth="1.6" strokeLinejoin="round">
              <path className="a1" d="M0 17.5H36V13L51.5 21L36 29V24.5H0Z" />
              <path className="a2" d="M64 39.5H28V35L12.5 43L28 51V46.5H64Z" />
            </g>
          </mask>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="15" fill="var(--action)" mask={`url(#${maskId})`} />
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
