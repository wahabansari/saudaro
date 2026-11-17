import type { SigningKeyPair } from '@saudaro/authentication';
import { loadEnv, publicJwks, requiredPublicJwks, z } from '@saudaro/validation';

type JWK = SigningKeyPair['publicJwk'];

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/** Private Ed25519 JWK with a kid; the public half is derived by dropping `d`. Failures never echo the value. */
const signingJwk = z.string().transform((raw, ctx): SigningKeyPair => {
  const { d, ...publicJwk } = (parseJson(raw) ?? {}) as JWK;
  if (!d || !publicJwk.kid) {
    ctx.addIssue({ code: 'custom', message: 'must be a JSON private JWK with a kid' });
    return z.NEVER;
  }
  return { kid: publicJwk.kid, privateJwk: { ...publicJwk, d }, publicJwk };
});

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Connection string for the RUNTIME role identity_svc (never the migrator or a superuser). */
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(['disable', 'require', 'verify-full']).default('disable'),
  DATABASE_SSL_CA: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  /** JWKS of the platform's token-signing keys (public). Used to verify service tokens on internal routes. */
  AUTH_PUBLIC_JWKS: publicJwks.default([]),
  /** Private signing JWK (with kid) of THIS service — the only signer of user and service tokens. */
  AUTH_SIGNING_JWK: signingJwk,
  COMPANY_SERVICE_URL: z.url(),
  REFRESH_TTL_SECONDS: z.coerce.number().int().min(60).default(1_209_600),
  AUTH_ISSUER: z.string().default('saudaro-identity'),
  AUTH_AUDIENCE: z.string().default('saudaro-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type IdentityConfig = z.output<typeof schema>;

export const loadConfig = (source: NodeJS.ProcessEnv = process.env): IdentityConfig => {
  const config = loadEnv(schema, source);
  if (config.NODE_ENV === 'production') loadEnv(z.object({ AUTH_PUBLIC_JWKS: requiredPublicJwks }), source);
  if (config.NODE_ENV === 'production' && config.DATABASE_SSL === 'disable') {
    throw new Error('Invalid environment configuration: DATABASE_SSL must not be "disable" in production');
  }
  return config;
};
