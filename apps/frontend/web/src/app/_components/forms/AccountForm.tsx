'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CURRENT_USER } from '@/lib/mock/session';
import { accountSchema, COUNTRY_CHOICES, type AccountFormValues } from '@/lib/schemas/account';
import { ErrorSummary, SelectField } from './formParts';

const DEFAULTS: AccountFormValues = {
  fullName: CURRENT_USER.name,
  email: CURRENT_USER.email,
  phone: '',
  company: CURRENT_USER.company,
  country: 'Pakistan',
  address: '',
};

export function AccountForm() {
  const {
    register,
    control,
    trigger,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: DEFAULTS,
    mode: 'onTouched',
  });

  return (
    <form
      noValidate
      className="grid gap-6"
      aria-label="Account details"
      onSubmit={(event) => {
        event.preventDefault();
        void trigger();
      }}
    >
      <ErrorSummary errors={errors} />
      <Card className="grid gap-6 sm:grid-cols-2">
        <Input label="Full name" required error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Email" required type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Phone"
          required
          type="tel"
          hint="Include the country code, for example +92 300 1234567."
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input label="Company" required error={errors.company?.message} {...register('company')} />
        <SelectField control={control} name="country" label="Country" options={COUNTRY_CHOICES} />
        <Textarea
          label="Business address"
          required
          error={errors.address?.message}
          {...register('address')}
        />
      </Card>
      <div>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
