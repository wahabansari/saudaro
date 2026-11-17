import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  pw: string,
  salt: Buffer,
  keylen: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// ---- refresh / verification tokens: opaque random, stored ONLY as a hash ---------------------------------
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** 256-bit opaque token. Send `token` to the client once; persist only `hash`. */
export function generateOpaqueToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

// ---- passwords: scrypt with per-password salt, PHC-like string -------------------------------------------
const PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEYLEN = 64;
const maxmemFor = (n: number, r: number) => 128 * n * r * 2;

export async function hashPassword(
  password: string,
  params: { N: number; r: number; p: number } = PARAMS,
): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEYLEN, {
    ...params,
    maxmem: maxmemFor(params.N, params.r),
  });
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

/** Valid-format hash nobody can match: verify against it when the account does not exist (login timing parity). */
export const DUMMY_HASH = `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${'A'.repeat(22)}$${'A'.repeat(86)}`;

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;
  if (Number(n) > PARAMS.N * 4 || Number(r) > 16 || Number(p) > 4) return false; // never trust stored cost blindly
  const expected = Buffer.from(hash, 'base64url');
  const derived = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: maxmemFor(Number(n), Number(r)),
  }).catch(() => undefined); // malformed stored cost (NaN, 0, non power of two) is a mismatch, not a 500
  return derived?.length === expected.length && timingSafeEqual(derived, expected);
}

/** True when the stored hash uses weaker parameters than today's policy (rehash on next successful login). */
export function passwordNeedsRehash(stored: string): boolean {
  const [scheme, n, r, p] = stored.split('$');
  return scheme !== 'scrypt' || Number(n) < PARAMS.N || Number(r) < PARAMS.r || Number(p) < PARAMS.p;
}
