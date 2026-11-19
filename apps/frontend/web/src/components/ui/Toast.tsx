'use client';

import * as RadixToast from '@radix-ui/react-toast';
import clsx from 'clsx';
import type { ComponentPropsWithRef, CSSProperties } from 'react';
import { Icon, type IconName } from '@/icons';

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

export type ToastProviderProps = RadixToast.ToastProviderProps;
export type ToastViewportProps = RadixToast.ToastViewportProps;
export type ToastProps = Omit<RadixToast.ToastProps, 'title' | 'type'> & {
  tone?: ToastTone;
  title: string;
  ref?: ComponentPropsWithRef<'li'>['ref'];
};

const TOAST_DURATION_MS = 6000;

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'ok',
  info: 'info',
  warning: 'warn',
  danger: 'alert',
};

const toneStyle = (tone: ToastTone): CSSProperties => ({
  background: `var(--${tone}-bg)`,
  color: `var(--${tone}-text)`,
});

export function ToastProvider({ duration = TOAST_DURATION_MS, ...props }: ToastProviderProps) {
  return <RadixToast.Provider duration={duration} {...props} />;
}

export function ToastViewport({ className, ...props }: ToastViewportProps) {
  return (
    <RadixToast.Viewport
      asChild
      className={clsx(
        'fixed inset-x-4 top-4 z-toast flex flex-col items-center gap-3 md:inset-x-auto md:bottom-4 md:right-4 md:top-auto md:items-end',
        className,
      )}
      {...props}
    >
      <div />
    </RadixToast.Viewport>
  );
}

export function Toast({ tone = 'success', title, children, className, ...props }: ToastProps) {
  const isError = tone === 'danger';
  return (
    <RadixToast.Root
      asChild
      type={isError ? 'foreground' : 'background'}
      role={isError ? 'alert' : 'status'}
      {...props}
    >
      <div className={clsx('sa-toast', className)}>
        <span className="sa-toast__icon" style={toneStyle(tone)}>
          <Icon name={TONE_ICON[tone]} size={20} />
        </span>
        <div>
          <strong>{title}</strong>
          {children}
        </div>
      </div>
    </RadixToast.Root>
  );
}
