import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

export type ProgressProps = Omit<ComponentPropsWithRef<'div'>, 'children'> & {
  value?: number;
};

const MIN = 0;
const MAX = 100;

export function Progress({ value, className, ...props }: ProgressProps) {
  if (value === undefined) {
    return (
      <div
        className={clsx('sa-progress sa-progress--indeterminate', className)}
        role="progressbar"
        {...props}
      >
        <div className="sa-progress__bar" />
      </div>
    );
  }
  const clamped = Math.min(MAX, Math.max(MIN, value));
  return (
    <div
      className={clsx('sa-progress', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      {...props}
    >
      <div className="sa-progress__bar" style={{ width: `${clamped}%` }} />
    </div>
  );
}
