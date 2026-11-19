import type { ComponentProps } from 'react';
import clsx from 'clsx';

export type DividerProps = ComponentProps<'hr'> & { label?: string };

export function Divider({ label, className, ...props }: DividerProps) {
  if (label) {
    return <div className={clsx('sa-divider sa-divider--text', className)}>{label}</div>;
  }
  return <hr className={clsx('sa-divider', className)} {...props} />;
}
