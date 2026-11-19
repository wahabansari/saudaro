import { z } from 'zod';
import { emailAddress, requiredText } from './fields';

export const accountSchema = z.object({
  fullName: requiredText('Enter your full name.'),
  email: emailAddress,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, 'Enter a phone number with country code.'),
  company: requiredText('Enter your company name.'),
  country: requiredText('Choose a country.'),
  address: requiredText('Enter your business address.'),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

export const COUNTRY_CHOICES = [
  { value: 'Pakistan', label: 'Pakistan' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'United Kingdom', label: 'United Kingdom' },
];
