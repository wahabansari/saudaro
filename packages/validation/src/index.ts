import { z } from 'zod';
import { ValidationError, type FieldError } from '@saudaro/error-handling';

export { z };

// ---- shared primitives (one definition of "valid" for every service) ---------------------------------
export const uuid = z.uuid();
export const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const isoCountry2 = z.string().regex(/^[A-Z]{2}$/, 'Must be an ISO 3166-1 alpha-2 code');
export const isoCurrency = z.string().regex(/^[A-Z]{3}$/, 'Must be an ISO 4217 code');
export const slug = z
  .string()
  .regex(/^[a-z0-9]([a-z0-9-]{1,62})[a-z0-9]$/, 'Lowercase letters, digits and hyphens only');
/** Money/quantities are decimal STRINGS (never floats) with at most 4 fractional digits. */
export const decimalAmount = z
  .string()
  .regex(/^\d{1,20}(\.\d{1,4})?$/, 'Must be a non-negative decimal amount');
export const password = z.string().min(12, 'At least 12 characters').max(128);
export const displayName = z.string().trim().min(1).max(120);
export const searchText = z.string().trim().min(1).max(200);

/** Cursor pagination arguments shared by every connection field. */
export const pageArgs = z.object({
  first: z.number().int().min(1).max(100).default(20),
  after: z.string().max(512).optional(),
});

// ---- helpers -----------------------------------------------------------------------------------------
function toDetails(error: z.ZodError): FieldError[] {
  return error.issues.map((i) => ({
    field: i.path.map(String).join('.') || '(root)',
    message: i.message,
    code: i.code,
  }));
}

/** Validates untrusted input; throws a ValidationError with field-level details (never the raw input). */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ValidationError('Some fields are invalid.', { details: toDetails(result.error) });
  return result.data;
}

/** Startup configuration loader: lists the offending KEYS only, never values (they may be secrets). */
export function loadEnv<S extends z.ZodType>(
  schema: S,
  source: NodeJS.ProcessEnv = process.env,
): z.output<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const keys = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${keys}`);
  }
  return result.data;
}

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/** Public JWKS (`{"keys":[...]}`) from an env value → its key array. Failures never echo the value. */
export const publicJwks = z.string().transform((raw, ctx): Array<Record<string, unknown>> => {
  const keys = (parseJson(raw) as { keys?: unknown } | undefined)?.keys;
  if (!Array.isArray(keys)) {
    ctx.addIssue({ code: 'custom', message: 'must be a JSON JWKS ({"keys":[...]})' });
    return z.NEVER;
  }
  return keys as Array<Record<string, unknown>>;
});

/** Same as publicJwks, but at least one key is required (production). */
export const requiredPublicJwks = publicJwks.refine(
  (keys) => keys.length > 0,
  'must contain at least one key',
);
