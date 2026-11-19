'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileUpload } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/icons';
import { LEVEL_CHOICES, verificationSchema, type VerificationFormValues } from '@/lib/schemas/verification';
import { CheckboxField, ErrorSummary, SelectField } from './formParts';

const DEFAULTS: VerificationFormValues = {
  level: '',
  registrationNumber: '',
  hasFile: false,
  confirmed: false,
};

export function VerificationForm() {
  const {
    register,
    control,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: DEFAULTS,
    mode: 'onTouched',
  });
  const fileError = errors.hasFile?.message;

  return (
    <form
      noValidate
      className="grid gap-6"
      aria-label="Submit documents for verification"
      onSubmit={(event) => {
        event.preventDefault();
        void trigger();
      }}
    >
      <ErrorSummary errors={errors} />
      <Card className="grid gap-6">
        <SelectField control={control} name="level" label="Verification level" options={LEVEL_CHOICES} />
        <Input
          label="Registration number"
          required
          error={errors.registrationNumber?.message}
          {...register('registrationNumber')}
        />
        <div className="sa-field">
          <span className="sa-label" id="verification-file-label">
            Registration certificate
          </span>
          <FileUpload
            accept=".pdf"
            aria-labelledby="verification-file-label"
            aria-describedby={fileError ? 'verification-file-error' : undefined}
            hint="PDF, up to 10 MB."
            onFiles={(files) => setValue('hasFile', files.length > 0, { shouldValidate: true })}
          />
          {watch('hasFile') ? <span className="sa-hint">Certificate added.</span> : null}
          {fileError ? (
            <span id="verification-file-error" className="sa-error">
              <Icon name="alert" size={14} />
              {fileError}
            </span>
          ) : null}
        </div>
        <CheckboxField control={control} name="confirmed" label="The documents are genuine" />
      </Card>
      <div>
        <Button type="submit">Submit for review</Button>
      </div>
    </form>
  );
}
