import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

export type ChipProps = ComponentProps<'button'> & { pressed?: boolean; icon?: IconName };

export function Chip({ pressed = false, icon, className, children, ...props }: ChipProps) {
  const iconName = pressed ? 'check' : icon;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={clsx('sa-chip', 'max-w-full', className)}
      {...props}
    >
      {iconName && <Icon name={iconName} size={20} />}
      {children}
    </button>
  );
}
