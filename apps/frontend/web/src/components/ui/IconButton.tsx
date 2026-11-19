import type { ComponentProps } from 'react';
import clsx from 'clsx';

type Props = ComponentProps<'button'> & {
  'aria-label': string;
  variant?: 'ghost' | 'filled';
  size?: 'md' | 'sm';
};

export type IconButtonProps = Props;

export function IconButton({ variant = 'ghost', size = 'md', className, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'sa-iconbtn',
        variant === 'filled' && 'sa-iconbtn--filled',
        size === 'sm' && 'sa-iconbtn--sm',
        className,
      )}
    />
  );
}
