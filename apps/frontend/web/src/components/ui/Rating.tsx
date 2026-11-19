import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { Icon } from '@/icons';

export type RatingProps = ComponentPropsWithRef<'div'> & {
  value: number;
  reviews?: number;
};

const STAR_COUNT = 5;

export function Rating({ value, reviews, className, ...props }: RatingProps) {
  const score = value.toFixed(1);
  const filled = Math.floor(value);
  return (
    <div className={clsx('flex items-center gap-2', className)} {...props}>
      <span className="sa-rate" role="img" aria-label={`${score} out of ${STAR_COUNT}`}>
        {Array.from({ length: STAR_COUNT }, (_, index) =>
          index < filled ? (
            <Icon key={index} name="star" size={20} />
          ) : (
            <span key={index} className="off">
              <Icon name="star" size={20} />
            </span>
          ),
        )}
      </span>
      <span className="sa-mono">{score}</span>
      {reviews === undefined ? null : (
        <span className="sa-muted">
          ({reviews} {reviews === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}
