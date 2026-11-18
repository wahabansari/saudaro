import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

export type AvatarProps = ComponentPropsWithRef<'span'> & {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  variant?: 'soft' | 'solid';
};

export function Avatar({
  size = 'md',
  shape = 'circle',
  variant = 'soft',
  className,
  ...props
}: AvatarProps) {
  return (
    <span
      className={clsx(
        'sa-avatar',
        size !== 'md' && `sa-avatar--${size}`,
        shape === 'square' && 'sa-avatar--sq',
        variant === 'solid' && 'sa-avatar--solid',
        className,
      )}
      {...props}
    />
  );
}
