'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CURRENCY_CHOICES,
  settingsSchema,
  TIME_ZONE_CHOICES,
  type SettingsFormValues,
} from '@/lib/schemas/settings';
import { CheckboxField, ErrorSummary, SelectField } from './formParts';

const DEFAULTS: SettingsFormValues = {
  currency: 'USD',
  timeZone: 'Asia/Karachi',
  notifyQuotations: true,
  notifyClosingSoon: true,
  notifyExpiringDocuments: true,
};

export function SettingsForm() {
  const {
    control,
    trigger,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULTS,
    mode: 'onTouched',
  });

  return (
    <form
      noValidate
      className="grid gap-6"
      aria-label="Preferences"
      onSubmit={(event) => {
        event.preventDefault();
        void trigger();
      }}
    >
      <ErrorSummary errors={errors} />
      <Card className="grid gap-6 sm:grid-cols-2">
        <SelectField control={control} name="currency" label="Default currency" options={CURRENCY_CHOICES} />
        <SelectField control={control} name="timeZone" label="Time zone" options={TIME_ZONE_CHOICES} />
        <fieldset className="m-0 grid gap-3 border-0 p-0 sm:col-span-2">
          <legend className="sa-label mb-3">Email notifications</legend>
          <CheckboxField control={control} name="notifyQuotations" label="New quotation received" />
          <CheckboxField control={control} name="notifyClosingSoon" label="RFQ closes in 2 days" />
          <CheckboxField
            control={control}
            name="notifyExpiringDocuments"
            label="Documents expire in 14 days"
          />
        </fieldset>
      </Card>
      <div>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
