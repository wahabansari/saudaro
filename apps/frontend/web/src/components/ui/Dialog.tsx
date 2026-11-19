'use client';

import * as D from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export { Close as DialogClose } from '@radix-ui/react-dialog';

export type DialogProps = Omit<ComponentProps<typeof D.Content>, 'title'> & {
  trigger: ReactNode;
  title: ReactNode;
  actions: ReactNode;
};

export function Dialog({ trigger, title, actions, children, className, ...props }: DialogProps) {
  return (
    <D.Root>
      <D.Trigger asChild className="data-[state=closed]:![animation:none]">
        {trigger}
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="sa-scrim fixed inset-0 z-modal">
          <D.Content className={clsx('sa-dialog', className)} {...props}>
            <D.Title>{title}</D.Title>
            <D.Description>{children}</D.Description>
            <div className="sa-dialog__actions">{actions}</div>
          </D.Content>
        </D.Overlay>
      </D.Portal>
    </D.Root>
  );
}
