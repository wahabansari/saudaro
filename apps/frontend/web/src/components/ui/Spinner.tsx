import type { ComponentProps } from 'react';
import clsx from 'clsx';

export type SpinnerProps = ComponentProps<'span'> & { large?: boolean };

export function Spinner({ large, className, ...props }: SpinnerProps) {
  return (
    <span role="status" className={clsx('sa-spinner', large && 'sa-spinner--lg', className)} {...props} />
  );
}
