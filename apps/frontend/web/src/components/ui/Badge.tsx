import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { Icon, type IconName } from '@/icons';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'outline' | 'solid';

export type BadgeProps = ComponentPropsWithRef<'span'> & {
  tone?: BadgeTone;
  size?: 'md' | 'lg';
  pill?: boolean;
  icon?: IconName;
};

export function Badge({ tone, size = 'md', pill, icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'sa-badge',
        tone && `sa-badge--${tone}`,
        size === 'lg' && 'sa-badge--lg',
        pill && 'sa-badge--pill',
        className,
      )}
      {...props}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </span>
  );
}

type StatusEntry = readonly [tone: BadgeTone, label: string, icon: IconName];

const STATUSES = {
  rfq: {
    draft: ['neutral', 'Draft', 'circle'],
    published: ['info', 'Published', 'info'],
    paused: ['warning', 'Paused', 'warn'],
    closed: ['neutral', 'Closed', 'circle'],
    expired: ['outline', 'Expired', 'clock'],
    cancelled: ['danger', 'Cancelled', 'alert'],
    awarded: ['success', 'Awarded', 'ok'],
  },
  quotation: {
    draft: ['neutral', 'Draft', 'circle'],
    submitted: ['info', 'Submitted', 'info'],
    under_negotiation: ['warning', 'Under negotiation', 'warn'],
    accepted: ['success', 'Accepted', 'ok'],
    rejected: ['danger', 'Rejected', 'alert'],
    withdrawn: ['outline', 'Withdrawn', 'clock'],
    expired: ['outline', 'Expired', 'clock'],
    superseded: ['outline', 'Superseded', 'clock'],
  },
  deal: {
    active: ['info', 'Active', 'info'],
    in_production: ['info', 'In production', 'info'],
    shipped: ['info', 'Shipped', 'info'],
    delivered: ['success', 'Delivered', 'ok'],
    completed: ['success', 'Completed', 'ok'],
    cancelled: ['danger', 'Cancelled', 'alert'],
    disputed: ['danger', 'Disputed', 'alert'],
  },
  verification: {
    draft: ['neutral', 'Draft', 'circle'],
    submitted: ['info', 'Submitted', 'info'],
    in_review: ['info', 'In review', 'info'],
    needs_info: ['warning', 'Needs info', 'warn'],
    approved: ['success', 'Approved', 'ok'],
    rejected: ['danger', 'Rejected', 'alert'],
    expired: ['outline', 'Expired', 'clock'],
    revoked: ['danger', 'Revoked', 'alert'],
  },
} as const satisfies Record<string, Record<string, StatusEntry>>;

type Statuses = typeof STATUSES;

export type StatusBadgeProps = {
  [Kind in keyof Statuses]: Omit<BadgeProps, 'tone' | 'icon' | 'children'> & {
    kind: Kind;
    status: keyof Statuses[Kind];
  };
}[keyof Statuses];

export function StatusBadge({ kind, status, ...props }: StatusBadgeProps) {
  const [tone, label, icon] = (STATUSES[kind] as Record<string, StatusEntry>)[
    status as string
  ] as StatusEntry;
  return (
    <Badge tone={tone} icon={icon} {...props}>
      {label}
    </Badge>
  );
}
