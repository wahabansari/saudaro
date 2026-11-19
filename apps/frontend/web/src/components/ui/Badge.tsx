import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export type BadgeProps = ComponentProps<'span'> & {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'outline' | 'solid';
  pill?: boolean;
  large?: boolean;
  icon?: IconName;
};

export function Badge({ tone, pill, large, icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'sa-badge',
        pill && 'sa-badge--pill',
        large && 'sa-badge--lg',
        tone && `sa-badge--${tone}`,
        'max-w-full',
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </span>
  );
}
