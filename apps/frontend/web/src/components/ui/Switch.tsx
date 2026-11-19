import type { ComponentProps } from 'react';
import clsx from 'clsx';

type Props = Omit<ComponentProps<'input'>, 'type'> & { label?: React.ReactNode };

export type SwitchProps = Props;

export function Switch({ label, className, ...props }: Props) {
  return (
    <label className={clsx('sa-switch max-w-full', className)}>
      <input type="checkbox" role="switch" {...props} />
      <span className="sa-switch__track" />
      {label}
    </label>
  );
}
