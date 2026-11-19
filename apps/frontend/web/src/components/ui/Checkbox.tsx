import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

type Props = Omit<ComponentProps<'input'>, 'type'> & { label?: React.ReactNode };

export type CheckboxProps = Props;

export function Checkbox({ label, className, ...props }: Props) {
  return (
    <label className={clsx('sa-check max-w-full', className)}>
      <input type="checkbox" {...props} />
      <span className="sa-check__box">
        <Icon name="check" size={20} />
      </span>
      {label}
    </label>
  );
}
