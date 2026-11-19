'use client';

import * as D from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '@/icons';

export { Close as SheetClose } from '@radix-ui/react-dialog';

export type SheetProps = Omit<ComponentProps<typeof D.Content>, 'title'> & {
  trigger: ReactNode;
  title: ReactNode;
};

export function Sheet({ trigger, title, children, className, ...props }: SheetProps) {
  return (
    <D.Root>
      <D.Trigger asChild className="data-[state=closed]:![animation:none]">
        {trigger}
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="sa-scrim fixed inset-0 z-modal justify-items-end !p-0">
          <D.Content className={clsx('sa-sheet', className)} aria-describedby={undefined} {...props}>
            <div className="flex items-center justify-between">
              <D.Title className="m-0 text-h4">{title}</D.Title>
              <D.Close className="sa-iconbtn" aria-label="Close">
                <Icon name="x" size={20} />
              </D.Close>
            </div>
            {children}
          </D.Content>
        </D.Overlay>
      </D.Portal>
    </D.Root>
  );
}
