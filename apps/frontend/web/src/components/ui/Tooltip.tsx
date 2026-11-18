'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export type TooltipProps = Omit<ComponentProps<typeof TooltipPrimitive.Content>, 'content'> & {
  content: ReactNode;
  delayDuration?: number;
  open?: boolean;
  container?: HTMLElement;
};

export function Tooltip({
  content,
  children,
  delayDuration = 300,
  className,
  sideOffset = 6,
  open,
  container,
  ...props
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root open={open}>
        <TooltipPrimitive.Trigger asChild className="data-[state=closed]:![animation:none]">
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={container}>
          <TooltipPrimitive.Content
            className={clsx(
              'sa-tip z-tooltip [--pop-origin:var(--radix-tooltip-content-transform-origin)]',
              className,
            )}
            sideOffset={sideOffset}
            {...props}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
