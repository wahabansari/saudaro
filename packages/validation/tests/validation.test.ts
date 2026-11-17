import { describe, expect, it } from 'vitest';
import { ValidationError } from '@saudaro/error-handling';
import {
  decimalAmount,
  email,
  isoCountry2,
  loadEnv,
  pageArgs,
  parseInput,
  publicJwks,
  requiredPublicJwks,
  slug,
  z,
} from '../src/index.ts';

describe('primitives', () => {
  it('normalises email and rejects invalid values', () => {
    expect(email.parse('  Buyer@Example.COM ')).toBe('buyer@example.com');
    expect(email.safeParse('not-an-email').success).toBe(false);
  });
  it('validates ISO country and slug', () => {
    expect(isoCountry2.safeParse('PK').success).toBe(true);
    expect(isoCountry2.safeParse('pk').success).toBe(false);
    expect(slug.safeParse('acme-exports').success).toBe(true);
    expect(slug.safeParse('Acme Exports').success).toBe(false);
  });
  it('keeps money as a decimal string', () => {
    expect(decimalAmount.safeParse('1234.5678').success).toBe(true);
    expect(decimalAmount.safeParse('12.34567').success).toBe(false);
    expect(decimalAmount.safeParse('-1').success).toBe(false);
  });
  it('bounds page size', () => {
    expect(pageArgs.parse({}).first).toBe(20);
    expect(pageArgs.safeParse({ first: 1000 }).success).toBe(false);
  });
});

describe('parseInput', () => {
  const schema = z.object({ name: z.string().min(2), email });
  it('returns typed data on success', () => {
    expect(parseInput(schema, { name: 'Ali', email: 'a@b.co' })).toEqual({ name: 'Ali', email: 'a@b.co' });
  });
  it('throws ValidationError with field-level details and no raw input', () => {
    try {
      parseInput(schema, { name: 'x', email: 'secret-not-email' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const err = e as ValidationError;
      expect(err.details.map((d) => d.field).sort()).toEqual(['email', 'name']);
      expect(JSON.stringify(err.details)).not.toContain('secret-not-email');
    }
  });
});

describe('loadEnv', () => {
  const schema = z.object({ PORT: z.coerce.number().int(), SECRET: z.string().min(8) });
  it('parses valid configuration', () => {
    expect(loadEnv(schema, { PORT: '3000', SECRET: 'long-enough' }).PORT).toBe(3000);
  });
  it('names failing keys but never echoes values', () => {
    expect(() => loadEnv(schema, { PORT: 'abc', SECRET: 'short-pw' })).toThrow(/PORT/);
    try {
      loadEnv(schema, { PORT: '1', SECRET: 'x' });
    } catch (e) {
      expect(String(e)).not.toContain('"x"');
    }
  });
});

describe('publicJwks', () => {
  const jwks = JSON.stringify({ keys: [{ kid: 'k1', kty: 'OKP', crv: 'Ed25519', x: 'abc' }] });
  it('parses a JWKS into its key array', () => {
    expect(publicJwks.parse(jwks)).toEqual([{ kid: 'k1', kty: 'OKP', crv: 'Ed25519', x: 'abc' }]);
  });
  it('rejects malformed JSON and a missing keys array without echoing the value', () => {
    for (const bad of ['{not json', '{}', '{"keys":"secret"}']) {
      const result = publicJwks.safeParse(bad);
      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).not.toContain(bad);
    }
  });
  it('allows an empty key set, which requiredPublicJwks rejects', () => {
    expect(publicJwks.parse('{"keys":[]}')).toEqual([]);
    expect(requiredPublicJwks.safeParse('{"keys":[]}').success).toBe(false);
    expect(requiredPublicJwks.parse(jwks)).toHaveLength(1);
  });
});
