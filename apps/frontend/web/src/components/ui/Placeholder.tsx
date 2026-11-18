import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { Icon } from '@/icons';

export type PlaceholderProps = Omit<ComponentPropsWithRef<'div'>, 'children'>;

export function Placeholder({ className, ...props }: PlaceholderProps) {
  return (
    <div className={clsx('sa-card__media', className)} {...props}>
      <Icon name="image" size={20} />
    </div>
  );
}
