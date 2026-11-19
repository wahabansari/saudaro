import type { ComponentProps } from 'react';
import clsx from 'clsx';

export type AvatarProps = ComponentProps<'span'> & {
  size?: 'sm' | 'lg';
  square?: boolean;
  solid?: boolean;
};

export function Avatar({ size, square, solid, className, ...props }: AvatarProps) {
  return (
    <span
      className={clsx(
        'sa-avatar',
        size && `sa-avatar--${size}`,
        solid && 'sa-avatar--solid',
        square && 'sa-avatar--sq',
        className,
      )}
      {...props}
    />
  );
}
