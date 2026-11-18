import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon, type IconName } from '@/icons';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export type AlertProps = Omit<ComponentPropsWithRef<'div'>, 'title'> & {
  tone?: AlertTone;
  title: ReactNode;
};

const TONE_ICON: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'ok',
  warning: 'warn',
  danger: 'alert',
};

export function Alert({ tone = 'info', title, children, className, ...props }: AlertProps) {
  return (
    <div
      className={clsx('sa-alert', tone !== 'info' && `sa-alert--${tone}`, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
      {...props}
    >
      <Icon name={TONE_ICON[tone]} size={20} />
      <div>
        <strong>{title}</strong>
        {children ? (
          <>
            <br />
            {children}
          </>
        ) : null}
      </div>
    </div>
  );
}
