import { z } from 'zod';

export const requiredText = (message: string) => z.string().trim().min(1, message);

export const positiveNumber = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value !== '' && Number(value) > 0, message);

export const optionalPositiveNumber = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || Number(value) > 0, message);

export const emailAddress = z.string().trim().email('Enter an email address like name@company.com.');

export const futureDate = (message: string) =>
  z
    .string()
    .min(1, message)
    .refine(
      (value) => value >= new Date().toISOString().slice(0, 10),
      'Choose a date that is not in the past.',
    );

export type SelectChoice = { value: string; label: string };
