import { loadEnv, publicJwks, requiredPublicJwks, z } from '@saudaro/validation';

export const GATEWAY_VERSION = '0.2.0';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Comma-separated browser origins allowed to call the gateway (exact match). */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  /** JWKS JSON (public keys only) published by the Identity Service, used to verify access tokens; parsed into its key array. */
  AUTH_PUBLIC_JWKS: publicJwks.prefault('{"keys":[]}'),
  AUTH_ISSUER: z.string().default('saudaro-identity'),
  AUTH_AUDIENCE: z.string().default('saudaro-api'),
  IDENTITY_SERVICE_URL: z.url().default('http://127.0.0.1:4001'),
  COMPANY_SERVICE_URL: z.url().default('http://127.0.0.1:4002'),
  /** The gateway's own private signing JWK (with kid) for service tokens. Required in production (checked at startup). */
  GATEWAY_SIGNING_JWK: z.string().optional(),
  GRAPHQL_MAX_DEPTH: z.coerce.number().int().min(1).default(10),
  GRAPHQL_MAX_COMPLEXITY: z.coerce.number().int().min(1).default(1000),
  /** Reject any operation that is not in the persisted allowlist (default: on in production). */
  GRAPHQL_PERSISTED_ONLY: bool,
  GRAPHQL_INTROSPECTION: bool,
  MAX_BODY: z.string().default('100kb'),
  MAX_RESPONSE_BYTES: z.coerce.number().int().min(1024).default(1_048_576),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(100).default(15_000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  /** Rate limiting is per replica (in-memory store). */
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  /** Proxy hops in front of the gateway (0 = none); needed so the rate limit keys on the real client IP. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SLOW_OPERATION_MS: z.coerce.number().int().min(1).default(1000),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type GatewayConfig = Omit<z.output<typeof schema>, 'GRAPHQL_PERSISTED_ONLY' | 'GRAPHQL_INTROSPECTION'> & {
  GRAPHQL_PERSISTED_ONLY: boolean;
  GRAPHQL_INTROSPECTION: boolean;
};

/** Secure-by-default: production enforces persisted queries and disables introspection unless overridden. */
export function loadGatewayConfig(source: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const isProd = source.NODE_ENV === 'production';
  const env = loadEnv(isProd ? schema.extend({ AUTH_PUBLIC_JWKS: requiredPublicJwks }) : schema, source);
  return {
    ...env,
    GRAPHQL_PERSISTED_ONLY: env.GRAPHQL_PERSISTED_ONLY ?? isProd,
    GRAPHQL_INTROSPECTION: env.GRAPHQL_INTROSPECTION ?? !isProd,
  };
}
