'use client';

import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon } from '@/icons';

export type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label?: ReactNode;
  indeterminate?: boolean;
};

export function Checkbox({ label, indeterminate = false, className, ref, ...props }: CheckboxProps) {
  function setRef(node: HTMLInputElement | null) {
    if (node) node.indeterminate = indeterminate;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }

  return (
    <label className={clsx('sa-check', className)}>
      <input type="checkbox" ref={setRef} {...props} />
      <span className="sa-check__box">
        <Icon name={indeterminate ? 'minus' : 'check'} size={20} />
      </span>
      {label}
    </label>
  );
}
