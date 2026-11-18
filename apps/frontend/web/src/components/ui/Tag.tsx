'use client';

import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { Icon } from '@/icons';

export type TagProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & {
  children: string;
  onRemove?: () => void;
};

export function Tag({ children, onRemove, className, ...props }: TagProps) {
  return (
    <span className={clsx('sa-tag', className)} {...props}>
      {children}
      {onRemove ? (
        <button type="button" aria-label={`Remove tag ${children}`} onClick={onRemove}>
          <Icon name="x" size={20} />
        </button>
      ) : null}
    </span>
  );
}
