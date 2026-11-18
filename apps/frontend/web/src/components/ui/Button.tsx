'use client';

import clsx from 'clsx';
import { cloneElement, isValidElement } from 'react';
import type { ComponentPropsWithRef, MouseEvent, ReactElement } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'dashed'
  | 'text'
  | 'link'
  | 'danger'
  | 'danger-soft'
  | 'inverse'
  | 'inverse-outline'
  | 'inverse-ghost';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingLabel?: string;
  asChild?: boolean;
};

function blockClick(event: MouseEvent) {
  event.preventDefault();
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel,
  asChild = false,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(
    'sa-btn',
    variant !== 'primary' && `sa-btn--${variant}`,
    size !== 'md' && `sa-btn--${size}`,
    className,
  );

  if (asChild && isValidElement<{ className?: string }>(children)) {
    return cloneElement(children as ReactElement<{ className?: string }>, {
      ...props,
      className: clsx(classes, children.props.className),
    });
  }

  return (
    <button
      type={type}
      className={classes}
      aria-busy={loading || undefined}
      {...props}
      onClick={loading ? blockClick : props.onClick}
    >
      {loading ? (
        <>
          <span className="sa-btn__label">{children}</span>
          <span
            className="sa-spinner"
            role="status"
            aria-label={loadingLabel ?? (typeof children === 'string' ? children : undefined)}
          />
        </>
      ) : (
        children
      )}
    </button>
  );
}
