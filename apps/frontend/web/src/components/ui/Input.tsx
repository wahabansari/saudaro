import clsx from 'clsx';
import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon } from '@/icons';
import type { IconName } from '@/icons';

export type InputProps = Omit<ComponentPropsWithRef<'input'>, 'size'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  icon?: IconName;
  size?: 'sm' | 'md' | 'lg';
};

export function Input({
  label,
  hint,
  error,
  icon,
  size = 'md',
  required,
  id: idProp,
  className,
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = (
    <input
      id={id}
      className={clsx('sa-input', size !== 'md' && `sa-input--${size}`, icon && 'sa-input--icon', className)}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={clsx(describedBy, messageId) || undefined}
      {...props}
    />
  );

  return (
    <div className="sa-field">
      {label ? (
        <label className="sa-label" htmlFor={id}>
          {label}
          {required ? (
            <>
              {' '}
              <span className="sa-req" aria-hidden="true">
                *
              </span>
            </>
          ) : null}
        </label>
      ) : null}
      {icon ? (
        <div className="sa-inputwrap">
          <Icon name={icon} size={20} />
          {control}
        </div>
      ) : (
        control
      )}
      {error ? (
        <span id={messageId} className="sa-error">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="sa-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
