import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

export type SpinnerProps = ComponentPropsWithRef<'span'> & {
  size?: 'md' | 'lg';
};

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <span
      className={clsx('sa-spinner', size === 'lg' && 'sa-spinner--lg', className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}
