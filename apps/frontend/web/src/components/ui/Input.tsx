import { useId, type ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/icons';

type Props = Omit<ComponentProps<'input'>, 'size'> & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  size?: 'sm' | 'md' | 'lg';
};

export type InputProps = Props;

export function Input({ label, hint, error, icon, size = 'md', className, id, required, ...props }: Props) {
  const uid = useId();
  const inputId = id ?? uid;
  const noteId = `${inputId}-note`;
  const control = (
    <input
      {...props}
      id={inputId}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={error || hint ? noteId : undefined}
      className={clsx(
        'sa-input min-w-0',
        size !== 'md' && `sa-input--${size}`,
        icon && 'sa-input--icon',
        className,
      )}
    />
  );
  return (
    <div className="sa-field min-w-0">
      {label && (
        <label className="sa-label" htmlFor={inputId}>
          {label}
          {required && (
            <>
              {' '}
              <span className="sa-req" aria-hidden="true">
                *
              </span>
            </>
          )}
        </label>
      )}
      {icon ? (
        <div className="sa-inputwrap">
          <Icon name={icon} size={20} />
          {control}
        </div>
      ) : (
        control
      )}
      {error ? (
        <span id={noteId} className="sa-error">
          <Icon name="alert" size={14} />
          {error}
        </span>
      ) : (
        hint && (
          <span id={noteId} className="sa-hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
