import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { Icon, type IconName } from '@/icons';

export type ChipProps = Omit<ComponentPropsWithRef<'button'>, 'aria-pressed'> & {
  pressed?: boolean;
  icon?: IconName;
};

export function Chip({ pressed = false, icon, className, children, ...props }: ChipProps) {
  const iconName = pressed ? 'check' : icon;
  return (
    <button type="button" className={clsx('sa-chip', className)} aria-pressed={pressed} {...props}>
      {iconName ? <Icon name={iconName} size={20} /> : null}
      {children}
    </button>
  );
}
