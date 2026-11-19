'use client';

import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '@/icons';

const ICONS = { info: 'info', warning: 'warn', success: 'ok' } as const;

export type BannerProps = ComponentProps<'div'> & {
  variant?: keyof typeof ICONS;
  heading?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
};

export function Banner({
  variant = 'info',
  heading,
  action,
  onDismiss,
  className,
  children,
  ...props
}: BannerProps) {
  return (
    <div className={clsx('@container', className)} {...props}>
      <div
        className={clsx('sa-banner @max-md:flex-wrap', variant !== 'info' && `sa-banner--${variant}`)}
        role={variant === 'warning' ? 'alert' : 'status'}
      >
        <Icon name={ICONS[variant]} />
        <p className="@max-md:basis-3/5">
          {heading && <strong>{heading}</strong>} {children}
        </p>
        {action}
        {onDismiss && (
          <button
            type="button"
            className="sa-iconbtn sa-iconbtn--sm"
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <Icon name="x" />
          </button>
        )}
      </div>
    </div>
  );
}
