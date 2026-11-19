import type { ComponentProps } from 'react';
import clsx from 'clsx';

export type SkeletonProps = ComponentProps<'span'> & { shape?: 'line' | 'title' | 'block' | 'circle' };

export function Skeleton({ shape = 'line', className, ...props }: SkeletonProps) {
  return <span className={clsx('sa-skel', `sa-skel--${shape}`, 'max-w-full', className)} {...props} />;
}
