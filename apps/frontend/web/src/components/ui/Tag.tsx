'use client';

import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

export type TagProps = Omit<ComponentProps<'span'>, 'children'> & {
  children: string;
  mono?: boolean;
  onRemove?: () => void;
};

export function Tag({ mono, onRemove, className, children, ...props }: TagProps) {
  return (
    <span className={clsx('sa-tag', mono && 'sa-mono', 'max-w-full', className)} {...props}>
      {children}
      {onRemove && (
        <button type="button" aria-label={`Remove tag ${children}`} onClick={onRemove}>
          <Icon name="x" size={20} />
        </button>
      )}
    </span>
  );
}
