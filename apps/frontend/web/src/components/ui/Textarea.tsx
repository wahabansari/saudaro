import { useId, type ComponentProps } from 'react';
import clsx from 'clsx';
import { Icon } from '@/icons';

type Props = ComponentProps<'textarea'> & { label?: string; hint?: string; error?: string };

export type TextareaProps = Props;

export function Textarea({ label, hint, error, className, id, ...props }: Props) {
  const uid = useId();
  const areaId = id ?? uid;
  const noteId = `${areaId}-note`;
  return (
    <div className="sa-field min-w-0">
      {label && (
        <label className="sa-label" htmlFor={areaId}>
          {label}
        </label>
      )}
      <textarea
        {...props}
        id={areaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        className={clsx('sa-textarea min-w-0', className)}
      />
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
