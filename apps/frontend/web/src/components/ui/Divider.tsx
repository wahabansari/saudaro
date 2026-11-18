import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

export type DividerProps = ComponentPropsWithRef<'div'>;

export function Divider({ className, children, ...props }: DividerProps) {
  if (children) {
    return (
      <div className={clsx('sa-divider sa-divider--text', className)} {...props}>
        {children}
      </div>
    );
  }
  return <hr className={clsx('sa-divider', className)} {...(props as ComponentPropsWithRef<'hr'>)} />;
}
