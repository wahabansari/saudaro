'use client';

import { useId, type ReactNode } from 'react';
import { Controller, type Control, type FieldErrors, type FieldValues, type Path } from 'react-hook-form';
import { Alert } from '@/components/ui/Alert';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Icon } from '@/icons';

type FieldProps<T extends FieldValues> = { control: Control<T>; name: Path<T> };

type SelectFieldProps<T extends FieldValues> = FieldProps<T> & {
  label: ReactNode;
  options: SelectOption[];
  placeholder?: string;
  hint?: ReactNode;
};

export function SelectField<T extends FieldValues>({ control, name, ...rest }: SelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          {...rest}
          name={field.name}
          value={field.value || undefined}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          required
        />
      )}
    />
  );
}

type CheckboxFieldProps<T extends FieldValues> = FieldProps<T> & { label: ReactNode };

export function CheckboxField<T extends FieldValues>({ control, name, label }: CheckboxFieldProps<T>) {
  const messageId = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="sa-field">
          <Checkbox
            label={label}
            name={field.name}
            checked={Boolean(field.value)}
            onChange={(event) => field.onChange(event.target.checked)}
            onBlur={field.onBlur}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? messageId : undefined}
          />
          {fieldState.error ? (
            <span id={messageId} className="sa-error">
              <Icon name="alert" size={14} />
              {fieldState.error.message}
            </span>
          ) : null}
        </div>
      )}
    />
  );
}

export function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const count = Object.keys(errors).length;
  if (count === 0) return null;
  return (
    <Alert tone="danger" title={count === 1 ? '1 field needs attention' : `${count} fields need attention`} />
  );
}
