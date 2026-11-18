'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type DialogProps = ComponentProps<typeof DialogPrimitive.Root>;
export type DialogTriggerProps = ComponentProps<typeof DialogPrimitive.Trigger>;
export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  container?: HTMLElement;
  overlayProps?: ComponentProps<'div'>;
};
export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>;
export type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>;
export type DialogActionsProps = ComponentProps<'div'>;

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;

export function DialogTrigger({ className, ...props }: DialogTriggerProps) {
  return (
    <DialogPrimitive.Trigger
      className={clsx('data-[state=closed]:![animation:none]', className)}
      {...props}
    />
  );
}

export function DialogContent({ className, container, overlayProps, ...props }: DialogContentProps) {
  const content = <DialogPrimitive.Content className={clsx('sa-dialog', className)} {...props} />;
  return (
    <DialogPrimitive.Portal container={container}>
      {container ? (
        <div {...overlayProps} className={clsx('sa-scrim', overlayProps?.className)}>
          {content}
        </div>
      ) : (
        <DialogPrimitive.Overlay className="sa-scrim fixed inset-0 z-modal">
          {content}
        </DialogPrimitive.Overlay>
      )}
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle(props: DialogTitleProps) {
  return <DialogPrimitive.Title {...props} />;
}

export function DialogDescription(props: DialogDescriptionProps) {
  return <DialogPrimitive.Description {...props} />;
}

export function DialogActions({ className, ...props }: DialogActionsProps) {
  return <div className={clsx('sa-dialog__actions', className)} {...props} />;
}
