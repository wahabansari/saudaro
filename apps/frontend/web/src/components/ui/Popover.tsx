'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type PopoverProps = ComponentProps<typeof PopoverPrimitive.Root>;
export type PopoverTriggerProps = ComponentProps<typeof PopoverPrimitive.Trigger>;
export type PopoverContentProps = ComponentProps<typeof PopoverPrimitive.Content> & {
  container?: HTMLElement;
};

export const Popover = PopoverPrimitive.Root;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverTrigger({ className, ...props }: PopoverTriggerProps) {
  return (
    <PopoverPrimitive.Trigger
      className={clsx('data-[state=closed]:![animation:none]', className)}
      {...props}
    />
  );
}

export function PopoverContent({
  className,
  sideOffset = 6,
  align = 'start',
  container,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        className={clsx(
          'sa-popover z-dropdown [--pop-origin:var(--radix-popover-content-transform-origin)]',
          className,
        )}
        sideOffset={sideOffset}
        align={align}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
