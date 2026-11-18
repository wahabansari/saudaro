import clsx from 'clsx';
import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Icon } from '@/icons';

export type TextareaProps = ComponentPropsWithRef<'textarea'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};

export function Textarea({
  label,
  hint,
  error,
  required,
  id: idProp,
  className,
  'aria-describedby': describedBy,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

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
      <textarea
        id={id}
        className={clsx('sa-textarea', className)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={clsx(describedBy, messageId) || undefined}
        {...props}
      />
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
