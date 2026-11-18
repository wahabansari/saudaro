import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Icon, type IconName } from '@/icons';

type BannerVariant = 'info' | 'warning' | 'success';

const ICONS: Record<BannerVariant, IconName> = { info: 'info', warning: 'warn', success: 'ok' };

export type BannerProps = Omit<ComponentProps<'div'>, 'title'> & {
  variant?: BannerVariant;
  title: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
};

export function Banner({
  variant = 'info',
  title,
  action,
  onDismiss,
  role = variant === 'warning' ? 'alert' : 'status',
  className,
  children,
  ...props
}: BannerProps) {
  return (
    <div
      role={role}
      className={clsx('sa-banner', variant !== 'info' && `sa-banner--${variant}`, className)}
      {...props}
    >
      <Icon name={ICONS[variant]} size={20} />
      <p>
        <strong>{title}</strong> {children}
      </p>
      {action}
      {onDismiss ? (
        <button type="button" className="sa-iconbtn sa-iconbtn--sm" aria-label="Dismiss" onClick={onDismiss}>
          <Icon name="x" size={20} />
        </button>
      ) : null}
    </div>
  );
}
