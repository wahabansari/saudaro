import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

const variants = {
  summary: { badge: 'success', icon: 'verified' },
  level: { badge: 'info', icon: 'shield' },
  pending: { badge: 'neutral', icon: 'clock' },
} as const;

export type VerificationBadgeProps = ComponentProps<'span'> & { variant?: keyof typeof variants };

export function VerificationBadge({
  variant = 'summary',
  className,
  children,
  ...rest
}: VerificationBadgeProps) {
  const { badge, icon } = variants[variant];
  return (
    <span className={clsx('sa-badge', `sa-badge--${badge}`, 'max-w-full', className)} {...rest}>
      <Icon name={icon} />
      {children}
    </span>
  );
}

export type VerificationListProps = ComponentProps<'ul'> & {
  items: { title: string; detail: string; done?: boolean }[];
};

export function VerificationList({ items, className, ...rest }: VerificationListProps) {
  return (
    <ul className={clsx('sa-vlist', className)} {...rest}>
      {items.map(({ title, detail, done }) => (
        <li key={title}>
          <span className={done ? 'ok' : 'no'}>
            <Icon name={done ? 'ok' : 'clock'} />
          </span>
          <span>
            <b>{title}</b>
            <small>{detail}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}
