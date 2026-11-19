'use client';

import * as T from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

export type TooltipProps = Omit<ComponentProps<typeof T.Content>, 'content'> & {
  content: ReactNode;
  children: ReactElement;
};

export function Tooltip({ content, children, className, ...props }: TooltipProps) {
  return (
    <T.Provider delayDuration={300}>
      <T.Root>
        <T.Trigger asChild className="data-[state=closed]:![animation:none]">
          {children}
        </T.Trigger>
        <T.Portal>
          <T.Content
            sideOffset={6}
            collisionPadding={16}
            className={clsx('sa-tip z-tooltip', className)}
            {...props}
          >
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
