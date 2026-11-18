import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';

export type SwitchProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'role' | 'children'> & {
  label: ReactNode;
};

export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <label className={clsx('sa-switch', className)}>
      <input type="checkbox" role="switch" {...props} />
      <span className="sa-switch__track" />
      {label}
    </label>
  );
}
