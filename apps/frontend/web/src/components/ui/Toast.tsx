'use client';

import type { ComponentProps, ReactNode } from 'react';
import * as T from '@radix-ui/react-toast';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

const TONES = {
  info: { icon: 'info', style: 'bg-info-bg text-info-text' },
  success: { icon: 'ok', style: 'bg-success-bg text-success-text' },
  warning: { icon: 'warn', style: 'bg-warning-bg text-warning-text' },
  danger: { icon: 'alert', style: 'bg-danger-bg text-danger-text' },
} as const satisfies Record<string, { icon: IconName; style: string }>;

export const ToastProvider = T.Provider;

export function ToastViewport({ className, ...props }: ComponentProps<typeof T.Viewport>) {
  return <T.Viewport className={clsx('m-0 grid max-w-full list-none gap-3 p-0', className)} {...props} />;
}

export type ToastProps = Omit<ComponentProps<typeof T.Root>, 'title'> & {
  tone?: keyof typeof TONES;
  title: ReactNode;
};

export function Toast({ tone = 'success', title, className, children, ...props }: ToastProps) {
  const { icon, style } = TONES[tone];
  const danger = tone === 'danger';
  return (
    <T.Root type={danger ? 'foreground' : 'background'} className={clsx('sa-toast', className)} {...props}>
      <span className={clsx('sa-toast__icon', style)}>
        <Icon name={icon} size={20} />
      </span>
      <div role={danger ? 'alert' : 'status'} className="min-w-0">
        <T.Title asChild>
          <strong>{title}</strong>
        </T.Title>
        {children}
      </div>
    </T.Root>
  );
}
