import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export type VerificationBadgeProps = Omit<ComponentProps<'span'>, 'children'> & {
  variant: 'summary' | 'level' | 'pending';
  /** Level name for `level` and `pending`, for example "Business registration". */
  label?: string;
  /** Verified level count for `summary`. */
  levels?: number;
};

const TONE = { summary: 'success', level: 'info', pending: 'neutral' } as const;
const ICON: Record<VerificationBadgeProps['variant'], IconName> = {
  summary: 'verified',
  level: 'shield',
  pending: 'clock',
};

/** The word "Verified" always accompanies the shield; lapsed levels stay visible as neutral. */
export function VerificationBadge({
  variant,
  label,
  levels = 0,
  className,
  ...rest
}: VerificationBadgeProps) {
  return (
    <span className={clsx('sa-badge', `sa-badge--${TONE[variant]}`, className)} {...rest}>
      <Icon name={ICON[variant]} size={20} />
      {variant === 'summary' ? `Verified · ${levels} ${levels === 1 ? 'level' : 'levels'}` : label}
    </span>
  );
}

export type VerificationListItem = {
  label: string;
  /** Preformatted caption, for example "Confirmed 02 Feb 2026". */
  detail: string;
  granted: boolean;
};

export type VerificationListProps = Omit<ComponentProps<'ul'>, 'children'> & {
  items: readonly VerificationListItem[];
};

export function VerificationList({ items, className, ...rest }: VerificationListProps) {
  return (
    <ul className={clsx('sa-vlist', className)} {...rest}>
      {items.map((item) => (
        <li key={item.label}>
          <span className={item.granted ? 'ok' : 'no'}>
            <Icon name={item.granted ? 'ok' : 'clock'} size={20} />
          </span>
          <span>
            <b>{item.label}</b>
            <small>{item.detail}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}
