import type { ComponentProps } from 'react';
import clsx from 'clsx';

export type ProgressProps = ComponentProps<'div'> & {
  'aria-label': string;
  value?: number;
};

export function Progress({ value, className, ...props }: ProgressProps) {
  const determinate = value !== undefined;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      className={clsx(
        'sa-progress',
        !determinate && 'sa-progress--indeterminate',
        'w-full min-w-0 max-w-full [contain:paint]',
        className,
      )}
      {...props}
    >
      <div className="sa-progress__bar" style={determinate ? { width: `${value}%` } : undefined} />
    </div>
  );
}
