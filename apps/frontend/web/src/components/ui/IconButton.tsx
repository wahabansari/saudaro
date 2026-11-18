import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { Icon } from '@/icons';
import type { IconName } from '@/icons';

export type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> & {
  'aria-label': string;
  icon: IconName;
  variant?: 'ghost' | 'outline' | 'filled';
  size?: 'sm' | 'md';
};

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'sa-iconbtn',
        variant !== 'ghost' && `sa-iconbtn--${variant}`,
        size === 'sm' && 'sa-iconbtn--sm',
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
