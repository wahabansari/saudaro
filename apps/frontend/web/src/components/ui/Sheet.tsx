'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Icon } from '@/icons';

export type SheetProps = ComponentProps<typeof DialogPrimitive.Root>;
export type SheetTriggerProps = ComponentProps<typeof DialogPrimitive.Trigger>;
export type SheetContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> & {
  title: ReactNode;
  container?: HTMLElement;
  overlayProps?: ComponentProps<'div'>;
};

export const Sheet = DialogPrimitive.Root;
export const SheetClose = DialogPrimitive.Close;

export function SheetTrigger({ className, ...props }: SheetTriggerProps) {
  return (
    <DialogPrimitive.Trigger
      className={clsx('data-[state=closed]:![animation:none]', className)}
      {...props}
    />
  );
}

export function SheetContent({
  title,
  className,
  children,
  container,
  overlayProps,
  ...props
}: SheetContentProps) {
  const content = (
    <DialogPrimitive.Content className={clsx('sa-sheet', className)} {...props}>
      <div className="flex items-center justify-between">
        <DialogPrimitive.Title className="m-0 text-h4">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close className="sa-iconbtn" aria-label="Close">
          <Icon name="x" size={20} />
        </DialogPrimitive.Close>
      </div>
      {children}
    </DialogPrimitive.Content>
  );
  const scrim = 'sa-scrim justify-items-end p-0';
  return (
    <DialogPrimitive.Portal container={container}>
      {container ? (
        <div {...overlayProps} className={clsx(scrim, overlayProps?.className)}>
          {content}
        </div>
      ) : (
        <DialogPrimitive.Overlay className={clsx(scrim, 'fixed inset-0 z-modal')}>
          {content}
        </DialogPrimitive.Overlay>
      )}
    </DialogPrimitive.Portal>
  );
}
