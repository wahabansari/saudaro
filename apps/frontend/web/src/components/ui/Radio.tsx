import type { ComponentProps } from 'react';
import clsx from 'clsx';

type Props = Omit<ComponentProps<'input'>, 'type'> & { label?: React.ReactNode };

export type RadioProps = Props;

export function Radio({ label, className, ...props }: Props) {
  return (
    <label className={clsx('sa-radio max-w-full', className)}>
      <input type="radio" {...props} />
      <span className="sa-radio__dot" />
      {label}
    </label>
  );
}
