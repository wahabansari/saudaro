import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

export type SkeletonProps = ComponentPropsWithRef<'span'> & {
  variant?: 'line' | 'title' | 'block' | 'circle';
};

export function Skeleton({ variant = 'line', className, ...props }: SkeletonProps) {
  return <span className={clsx('sa-skel', `sa-skel--${variant}`, className)} aria-hidden="true" {...props} />;
}
