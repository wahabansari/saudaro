'use client';

import * as P from '@radix-ui/react-popover';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export type PopoverProps = Omit<ComponentProps<typeof P.Content>, 'title'> & {
  trigger: ReactNode;
  title: string;
};

export function Popover({ trigger, title, children, className, ...props }: PopoverProps) {
  return (
    <P.Root>
      <P.Trigger asChild className="data-[state=closed]:![animation:none]">
        {trigger}
      </P.Trigger>
      <P.Portal>
        <P.Content
          sideOffset={6}
          collisionPadding={16}
          aria-label={title}
          className={clsx('sa-popover z-toast max-w-[calc(100vw-2rem)]', className)}
          {...props}
        >
          <strong>{title}</strong>
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
