import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon } from '@/icons';

export type StatisticProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  trend?: 'up' | 'down';
};

export function Statistic({ label, value, delta, trend = 'up', className, ...props }: StatisticProps) {
  return (
    <div className={clsx('sa-stat', className)} {...props}>
      <span className="sa-stat__label">{label}</span>
      <span className="sa-stat__value">{value}</span>
      {delta === undefined ? null : (
        <span className={clsx('sa-stat__delta', `sa-stat__delta--${trend}`)}>
          <Icon name="arrow-right" size={20} />
          {delta}
        </span>
      )}
    </div>
  );
}
