import type { ComponentProps, ReactNode } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

const TONES = {
  info: { icon: 'info', role: 'status' },
  success: { icon: 'ok', role: 'status' },
  warning: { icon: 'warn', role: 'status' },
  danger: { icon: 'alert', role: 'alert' },
} as const satisfies Record<string, { icon: IconName; role: string }>;

export type AlertProps = Omit<ComponentProps<'div'>, 'title'> & {
  tone?: keyof typeof TONES;
  title: ReactNode;
};

export function Alert({ tone = 'info', title, className, children, ...props }: AlertProps) {
  const { icon, role } = TONES[tone];
  return (
    <div className="@container min-w-0 max-w-full">
      <div
        role={role}
        className={clsx(
          'sa-alert',
          tone !== 'info' && `sa-alert--${tone}`,
          'flex-col @xs:flex-row',
          className,
        )}
        {...props}
      >
        <Icon name={icon} size={20} />
        <div className="min-w-0">
          <strong>{title}</strong>
          <br />
          {children}
        </div>
      </div>
    </div>
  );
}
