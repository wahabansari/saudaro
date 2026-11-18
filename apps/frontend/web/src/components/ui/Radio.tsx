import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';

export type RadioProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label: ReactNode;
};

export function Radio({ label, className, ...props }: RadioProps) {
  return (
    <label className={clsx('sa-radio', className)}>
      <input type="radio" {...props} />
      <span className="sa-radio__dot" />
      {label}
    </label>
  );
}
