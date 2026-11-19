import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type StatisticProps = Omit<ComponentProps<'div'>, 'children'> & {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down';
};

export function Statistic({ label, value, delta, trend = 'up', className, ...props }: StatisticProps) {
  return (
    <div className={clsx('sa-stat', 'min-w-0', className)} {...props}>
      <span className="sa-stat__label">{label}</span>
      <span className="sa-stat__value break-words">{value}</span>
      {delta && (
        <span className={`sa-stat__delta sa-stat__delta--${trend}`}>
          <Icon name="arrow-right" size={20} />
          {delta}
        </span>
      )}
    </div>
  );
}
