import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type RatingProps = ComponentProps<'span'> & { value: number; max?: number };

export function Rating({ value, max = 5, className, ...props }: RatingProps) {
  const filled = Math.floor(value);
  return (
    <span role="img" aria-label={`${value} out of ${max}`} className={clsx('sa-rate', className)} {...props}>
      {Array.from({ length: max }, (_, i) =>
        i < filled ? (
          <Icon key={i} name="star" size={20} />
        ) : (
          <span key={i} className="off">
            <Icon name="star" size={20} />
          </span>
        ),
      )}
    </span>
  );
}
