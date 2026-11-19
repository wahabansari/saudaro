import { z } from 'zod';
import { requiredText } from './fields';

export const settingsSchema = z.object({
  currency: requiredText('Choose a default currency.'),
  timeZone: requiredText('Choose a time zone.'),
  notifyQuotations: z.boolean(),
  notifyClosingSoon: z.boolean(),
  notifyExpiringDocuments: z.boolean(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const CURRENCY_CHOICES = ['USD', 'EUR', 'GBP', 'AED'].map((value) => ({ value, label: value }));

export const TIME_ZONE_CHOICES = [
  { value: 'Asia/Karachi', label: 'Karachi (UTC+05:00)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+04:00)' },
  { value: 'Europe/London', label: 'London (UTC+00:00)' },
];
