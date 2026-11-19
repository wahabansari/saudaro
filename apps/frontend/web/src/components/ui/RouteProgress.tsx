import clsx from 'clsx';
import type { ComponentProps, CSSProperties } from 'react';

export type RouteProgressProps = ComponentProps<'div'> & {
  value?: number;
  label?: string;
};

export function RouteProgress({
  value,
  label = 'Loading page',
  className,
  style,
  ...props
}: RouteProgressProps) {
  const determinate = value !== undefined;
  return (
    <div
      className={clsx('sa-route', className)}
      style={determinate ? ({ '--p': value, ...style } as CSSProperties) : style}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      {...props}
    />
  );
}
