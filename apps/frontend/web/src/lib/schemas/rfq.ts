import { z } from 'zod';
import { futureDate, optionalPositiveNumber, positiveNumber, requiredText } from './fields';

export const rfqSchema = z.object({
  product: requiredText('Enter a product name.'),
  hsCode: z
    .string()
    .trim()
    .regex(/^\d{4}(\.\d{2})?$/, 'Enter an HS code like 1006.30.'),
  quantity: positiveNumber('Enter a quantity greater than 0.'),
  unit: requiredText('Choose a unit.'),
  incoterm: requiredText('Choose an Incoterm.'),
  destinationPort: requiredText('Add a delivery port to publish.'),
  targetPrice: optionalPositiveNumber('Enter a price greater than 0.'),
  deadline: futureDate('Choose a quotation deadline.'),
  notes: z.string().max(1000, 'Keep notes under 1,000 characters.'),
  confirmed: z.boolean().refine(Boolean, 'Confirm the details before you post.'),
});

export type RfqFormValues = z.infer<typeof rfqSchema>;

export const RFQ_DEFAULTS: RfqFormValues = {
  product: '',
  hsCode: '',
  quantity: '',
  unit: '',
  incoterm: '',
  destinationPort: '',
  targetPrice: '',
  deadline: '',
  notes: '',
  confirmed: false,
};

export const UNIT_CHOICES = [
  { value: 'MT', label: 'MT' },
  { value: 'KG', label: 'KG' },
  { value: 'PCS', label: 'PCS' },
];

export const INCOTERM_CHOICES = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP'].map((value) => ({ value, label: value }));
