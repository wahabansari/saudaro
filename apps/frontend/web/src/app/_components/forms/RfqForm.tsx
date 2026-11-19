'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Stepper } from '@/components/ui/Stepper';
import { Textarea } from '@/components/ui/Textarea';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  INCOTERM_CHOICES,
  RFQ_DEFAULTS,
  rfqSchema,
  UNIT_CHOICES,
  type RfqFormValues,
} from '@/lib/schemas/rfq';
import { CheckboxField, ErrorSummary, SelectField } from './formParts';

const STEPS = ['Product', 'Terms', 'Review'];

export function RfqForm() {
  const {
    register,
    control,
    trigger,
    formState: { errors },
  } = useForm<RfqFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: RFQ_DEFAULTS,
    mode: 'onTouched',
  });

  return (
    <form
      noValidate
      className="grid gap-6"
      aria-label="Post an RFQ"
      onSubmit={(event) => {
        event.preventDefault();
        void trigger();
      }}
    >
      <Stepper steps={STEPS} current={0} aria-label="Progress" />
      <ErrorSummary errors={errors} />
      <Card className="grid gap-6 sm:grid-cols-2">
        <Input label="Product" required error={errors.product?.message} {...register('product')} />
        <Input
          label="HS code"
          required
          hint="Four or six digits, for example 1006.30."
          error={errors.hsCode?.message}
          {...register('hsCode')}
        />
        <Input
          label="Quantity"
          required
          type="number"
          inputMode="decimal"
          error={errors.quantity?.message}
          {...register('quantity')}
        />
        <SelectField control={control} name="unit" label="Unit" options={UNIT_CHOICES} />
        <SelectField control={control} name="incoterm" label="Incoterm" options={INCOTERM_CHOICES} />
        <Input
          label="Destination port"
          required
          error={errors.destinationPort?.message}
          {...register('destinationPort')}
        />
        <Input
          label="Target price (USD per unit)"
          type="number"
          inputMode="decimal"
          error={errors.targetPrice?.message}
          {...register('targetPrice')}
        />
        <Input
          label="Quotation deadline"
          required
          type="date"
          error={errors.deadline?.message}
          {...register('deadline')}
        />
        <div className="sm:col-span-2">
          <Textarea label="Notes" error={errors.notes?.message} {...register('notes')} />
        </div>
        <div className="sm:col-span-2">
          <FileUpload multiple accept=".pdf,.jpg,.png" hint="Specification sheets, PDF up to 10 MB." />
        </div>
      </Card>
      <CheckboxField control={control} name="confirmed" label="The details above are correct" />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Post an RFQ</Button>
        <Button type="button" variant="secondary">
          Save draft
        </Button>
      </div>
    </form>
  );
}
