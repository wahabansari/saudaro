import { z } from 'zod';
import { requiredText } from './fields';

export const verificationSchema = z.object({
  level: requiredText('Choose a verification level.'),
  registrationNumber: z.string().trim().min(5, 'Enter your registration number, at least 5 characters.'),
  hasFile: z.boolean().refine(Boolean, 'Upload the registration certificate as a PDF.'),
  confirmed: z.boolean().refine(Boolean, 'Confirm that the documents are genuine.'),
});

export type VerificationFormValues = z.infer<typeof verificationSchema>;

export const LEVEL_CHOICES = [
  { value: 'business', label: 'Business registration' },
  { value: 'licence', label: 'Export licence' },
  { value: 'food-safety', label: 'Food safety certificate' },
  { value: 'bank', label: 'Bank account' },
];
