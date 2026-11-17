import { SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthenticationError } from '@saudaro/error-handling';
import {
  DUMMY_HASH,
  TokenService,
  generateOpaqueToken,
  generateSigningKey,
  hashPassword,
  hashToken,
  passwordNeedsRehash,
  verifyPassword,
  type SigningKeyPair,
} from '../src/index.ts';

const claims = {
  sub: '11111111-1111-4111-8111-111111111111',
  cid: '22222222-2222-4222-8222-222222222222',
  sid: '33333333-3333-4333-8333-333333333333',
  ver: 1,
  perms: ['rfq.create'],
  amr: ['pwd'],
};

let key: SigningKeyPair;
let other: SigningKeyPair;
beforeAll(async () => {
  key = await generateSigningKey('k1');
  other = await generateSigningKey('k2');
});

const service = (extra: Partial<ConstructorParameters<typeof TokenService>[0]> = {}) =>
  new TokenService({
    issuer: 'identity',
    audience: 'saudaro-api',
    signingKey: key,
    verificationKeys: [key.publicJwk],
    ...extra,
  });

describe('access tokens', () => {
  it('round-trips validated claims', async () => {
    const s = service();
    const verified = await s.verifyAccess(await s.signAccess(claims));
    expect(verified).toMatchObject(claims);
  });

  it('expires (default 5 minutes) with a distinct, safe error', async () => {
    const issued = new Date('2026-11-17T10:00:00Z');
    const token = await service({ now: () => issued }).signAccess(claims);
    await expect(
      service({ now: () => new Date(issued.getTime() + 299_000) }).verifyAccess(token),
    ).resolves.toBeTruthy();
    await expect(
      service({ now: () => new Date(issued.getTime() + 301_000) }).verifyAccess(token),
    ).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
      httpStatus: 401,
    });
  });

  it('rejects wrong audience, wrong issuer and a foreign signing key', async () => {
    const token = await service().signAccess(claims);
    await expect(service({ audience: 'other' }).verifyAccess(token)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    await expect(service({ issuer: 'evil' }).verifyAccess(token)).rejects.toBeInstanceOf(AuthenticationError);
    const forged = await new TokenService({
      issuer: 'identity',
      audience: 'saudaro-api',
      signingKey: { ...other, kid: 'k1' },
      verificationKeys: [other.publicJwk],
    }).signAccess(claims);
    await expect(service().verifyAccess(forged)).rejects.toMatchObject({ code: 'TOKEN_INVALID' });
  });

  it('rejects tampered payloads and unsigned (alg=none) tokens', async () => {
    const token = await service().signAccess(claims);
    const [h, , sig] = token.split('.') as [string, string, string];
    const evilPayload = Buffer.from(
      JSON.stringify({
        ...claims,
        perms: ['company.manage'],
        iss: 'identity',
        aud: 'saudaro-api',
        exp: 9999999999,
      }),
    ).toString('base64url');
    await expect(service().verifyAccess(`${h}.${evilPayload}.${sig}`)).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
    });
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${evilPayload}.`;
    await expect(service().verifyAccess(none)).rejects.toMatchObject({ code: 'TOKEN_INVALID' });
    await expect(service().verifyAccess('garbage')).rejects.toMatchObject({ code: 'TOKEN_INVALID' });
  });

  it('rejects a token whose header has no kid', async () => {
    const { importJWK } = await import('jose');
    const noKid = await new SignJWT({ ...claims, sub: undefined })
      .setProtectedHeader({ alg: 'EdDSA', typ: 'at+jwt' })
      .setSubject(claims.sub)
      .setIssuer('identity')
      .setAudience('saudaro-api')
      .setExpirationTime('1m')
      .sign(await importJWK(key.privateJwk, 'EdDSA'));
    await expect(service().verifyAccess(noKid)).rejects.toMatchObject({ code: 'TOKEN_INVALID' });
  });

  it('refuses claims that fail the schema (no subject)', async () => {
    await expect(service().signAccess({ ...claims, sub: 'not-a-uuid' })).rejects.toThrow();
  });

  it('supports key rotation: tokens from the previous key verify while it stays published', async () => {
    const old = await service().signAccess(claims);
    const rotated = service({ signingKey: other, verificationKeys: [other.publicJwk, key.publicJwk] });
    await expect(rotated.verifyAccess(old)).resolves.toBeTruthy();
    const retired = service({ signingKey: other, verificationKeys: [other.publicJwk] });
    await expect(retired.verifyAccess(old)).rejects.toMatchObject({ code: 'TOKEN_INVALID' });
  });

  it('publishes only public key material', () => {
    const jwks = JSON.stringify(service().jwks());
    expect(jwks).not.toContain('"d"');
  });
});

describe('service tokens', () => {
  it('authenticate a calling service for a specific audience only', async () => {
    const s = service();
    const t = await s.signServiceToken('api-gateway', 'company-service');
    await expect(s.verifyServiceToken(t, 'company-service')).resolves.toEqual({ svc: 'api-gateway' });
    await expect(s.verifyServiceToken(t, 'identity-service')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('are not interchangeable with user access tokens', async () => {
    const s = service();
    const svc = await s.signServiceToken('api-gateway', 'saudaro-api');
    await expect(s.verifyAccess(svc)).rejects.toBeInstanceOf(AuthenticationError);
    const user = await s.signAccess(claims);
    await expect(s.verifyServiceToken(user, 'saudaro-api')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('a service-only key (use "svc") signs service tokens but can never mint user access tokens', async () => {
    const svcKey = await generateSigningKey('svc-k', 'svc');
    const keys = [key.publicJwk, svcKey.publicJwk];
    const minter = service({ signingKey: svcKey, verificationKeys: keys });
    const verifier = service({ verificationKeys: keys });
    await expect(verifier.verifyAccess(await minter.signAccess(claims))).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
    });
    await expect(
      verifier.verifyServiceToken(await minter.signServiceToken('api-gateway', 'x'), 'x'),
    ).resolves.toEqual({ svc: 'api-gateway' });
  });

  it('a verifier without a signing key cannot mint tokens', async () => {
    const verifierOnly = new TokenService({
      issuer: 'identity',
      audience: 'saudaro-api',
      verificationKeys: [key.publicJwk],
    });
    await expect(verifierOnly.signAccess(claims)).rejects.toThrow('signing key');
  });

  it('rejects tokens signed with a mismatched typ header', async () => {
    const { importJWK } = await import('jose');
    const bare = await new SignJWT({ svc: 'x' })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
      .setIssuer('saudaro:services')
      .setAudience('company-service')
      .setExpirationTime('1m')
      .sign(await importJWK(key.privateJwk, 'EdDSA'));
    await expect(service().verifyServiceToken(bare, 'company-service')).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});

describe('opaque tokens and passwords', () => {
  it('generates unique 256-bit tokens and stores only the hash', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });

  it('hashes passwords with salt, verifies, and never stores plaintext', async () => {
    const h1 = await hashPassword('correct horse battery staple');
    const h2 = await hashPassword('correct horse battery staple');
    expect(h1).not.toBe(h2);
    expect(h1).not.toContain('correct horse');
    expect(await verifyPassword('correct horse battery staple', h1)).toBe(true);
    expect(await verifyPassword('wrong password!!', h1)).toBe(false);
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(passwordNeedsRehash(h1)).toBe(false);
    expect(passwordNeedsRehash(await hashPassword('x'.repeat(12), { N: 1024, r: 8, p: 1 }))).toBe(true);
  });

  it('verifies against DUMMY_HASH without throwing and never matches', async () => {
    await expect(verifyPassword('anything at all', DUMMY_HASH)).resolves.toBe(false);
    await expect(verifyPassword('', DUMMY_HASH)).resolves.toBe(false);
  });

  it('rejects absurd or malformed stored cost parameters instead of burning CPU or throwing', async () => {
    const salt = 'A'.repeat(22);
    const hash = 'A'.repeat(86);
    for (const [n, r, p] of [
      ['4294967296', '8', '1'],
      ['32768', '1000', '1'],
      ['32768', '8', '100'],
      ['abc', '8', '1'],
      ['0', '8', '1'],
      ['32768', '0', '1'],
      ['32768', '8', '0'],
      ['3', '8', '1'],
    ]) {
      await expect(verifyPassword('pw', ['scrypt', n, r, p, salt, hash].join('$'))).resolves.toBe(false);
    }
  });
});
