import { SignJWT, exportJWK, generateKeyPair, importJWK, jwtVerify, type JWK } from 'jose';
import { AuthenticationError } from '@saudaro/error-handling';
import {
  accessClaimsSchema,
  serviceClaimsSchema,
  type AccessClaims,
  type AccessClaimsInput,
  type ServiceClaims,
} from './claims.ts';

const ALG = 'EdDSA';
const SERVICE_ISSUER = 'saudaro:services';

export interface SigningKeyPair {
  kid: string;
  privateJwk: JWK;
  publicJwk: JWK;
}

/**
 * Generates an Ed25519 key pair for token signing. `use: 'svc'` marks a service-only key (e.g. the gateway's):
 * it can sign service tokens but verifyAccess rejects anything it signed. Store the private JWK in the secrets manager, never in git. */
export async function generateSigningKey(
  kid = `k-${Date.now().toString(36)}`,
  use: 'sig' | 'svc' = 'sig',
): Promise<SigningKeyPair> {
  const { publicKey, privateKey } = await generateKeyPair(ALG, { extractable: true, crv: 'Ed25519' });
  const privateJwk = { ...(await exportJWK(privateKey)), kid, alg: ALG, use };
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: ALG, use };
  return { kid, privateJwk, publicJwk };
}

export interface TokenServiceOptions {
  /** `iss` of end-user access tokens (the Identity Service). */
  issuer: string;
  /** `aud` of end-user access tokens (the platform API). */
  audience: string;
  /** Present only in the Identity Service (the only signer of user tokens). */
  signingKey?: SigningKeyPair;
  /** Public keys accepted for verification (current + previous during rotation). */
  verificationKeys: JWK[];
  accessTtlSeconds?: number;
  /** Test seam for time-dependent behaviour. */
  now?: () => Date;
}

type KeyLike = Awaited<ReturnType<typeof importJWK>>;

/**
 * Signs and verifies platform tokens. Access tokens are short-lived (default 5 min), asymmetric (EdDSA) and
 * verifiable by any service from the published JWKS without sharing a secret. Service tokens authenticate
 * service-to-service calls (`iss` = saudaro:services, `aud` = target service).
 */
export class TokenService {
  private readonly keys = new Map<string, KeyLike>();
  private privateKey: KeyLike | undefined;
  private readonly accessTtl: number;
  private readonly now: () => Date;

  constructor(private readonly opts: TokenServiceOptions) {
    this.accessTtl = opts.accessTtlSeconds ?? 300;
    this.now = opts.now ?? (() => new Date());
  }

  private async verificationKey(kid: string | undefined): Promise<KeyLike> {
    const jwk = kid ? this.opts.verificationKeys.find((k) => k.kid === kid) : undefined;
    if (!jwk?.kid)
      throw new AuthenticationError('Your session is invalid. Please sign in again.', {
        code: 'TOKEN_INVALID',
      });
    let key = this.keys.get(jwk.kid);
    if (!key) {
      key = await importJWK(jwk, ALG);
      this.keys.set(jwk.kid, key);
    }
    return key;
  }

  private async signer(): Promise<{ key: KeyLike; kid: string }> {
    const sk = this.opts.signingKey;
    if (!sk) throw new Error('This process holds no signing key');
    this.privateKey ??= await importJWK(sk.privateJwk, ALG);
    return { key: this.privateKey, kid: sk.kid };
  }

  async signAccess(claims: AccessClaimsInput): Promise<string> {
    const parsed = accessClaimsSchema.parse(claims);
    const { key, kid } = await this.signer();
    const { sub, ...rest } = parsed;
    const now = this.now();
    return new SignJWT({ ...rest })
      .setProtectedHeader({ alg: ALG, kid, typ: 'at+jwt' })
      .setSubject(sub)
      .setIssuer(this.opts.issuer)
      .setAudience(this.opts.audience)
      .setIssuedAt(now)
      .setExpirationTime(new Date(now.getTime() + this.accessTtl * 1000))
      .setJti(crypto.randomUUID())
      .sign(key);
  }

  /** Verifies signature, algorithm, issuer, audience and expiry; returns validated claims. */
  async verifyAccess(token: string): Promise<AccessClaims> {
    try {
      const header = decodeHeader(token);
      if (this.opts.verificationKeys.find((k) => k.kid === header.kid)?.use === 'svc')
        throw new AuthenticationError('Your session is invalid. Please sign in again.', {
          code: 'TOKEN_INVALID',
        });
      const key = await this.verificationKey(header.kid);
      const { payload } = await jwtVerify(token, key, {
        algorithms: [ALG],
        issuer: this.opts.issuer,
        audience: this.opts.audience,
        currentDate: this.now(),
        typ: 'at+jwt',
      });
      return accessClaimsSchema.parse({ ...payload, sub: payload.sub });
    } catch (err) {
      throw toAuthError(err);
    }
  }

  async signServiceToken(service: string, audience: string, ttlSeconds = 60): Promise<string> {
    const { key, kid } = await this.signer();
    const now = this.now();
    return new SignJWT(serviceClaimsSchema.parse({ svc: service }))
      .setProtectedHeader({ alg: ALG, kid, typ: 'svc+jwt' })
      .setIssuer(SERVICE_ISSUER)
      .setAudience(audience)
      .setIssuedAt(now)
      .setExpirationTime(new Date(now.getTime() + ttlSeconds * 1000))
      .sign(key);
  }

  async verifyServiceToken(token: string, expectedAudience: string): Promise<ServiceClaims> {
    try {
      const header = decodeHeader(token);
      const key = await this.verificationKey(header.kid);
      const { payload } = await jwtVerify(token, key, {
        algorithms: [ALG],
        issuer: SERVICE_ISSUER,
        audience: expectedAudience,
        currentDate: this.now(),
        typ: 'svc+jwt',
      });
      return serviceClaimsSchema.parse(payload);
    } catch (err) {
      throw toAuthError(err);
    }
  }

  /** Public JWKS document (served by Identity at /.well-known/jwks.json). */
  jwks(): { keys: JWK[] } {
    return { keys: this.opts.verificationKeys };
  }
}

function decodeHeader(token: string): { kid?: string; alg?: string } {
  const part = token.split('.')[0];
  if (!part) throw new Error('malformed');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function toAuthError(err: unknown): AuthenticationError {
  const name = (err as { code?: string })?.code;
  if (name === 'ERR_JWT_EXPIRED') {
    return new AuthenticationError('Your session has expired. Please sign in again.', {
      code: 'TOKEN_EXPIRED',
      cause: err,
    });
  }
  if (err instanceof AuthenticationError) return err;
  // Do not reveal WHY a token is invalid (signature, audience, algorithm, claims, …).
  return new AuthenticationError('Your session is invalid. Please sign in again.', {
    code: 'TOKEN_INVALID',
    cause: err,
  });
}
