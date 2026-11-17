import { loadEnv, publicJwks, requiredPublicJwks, z } from '@saudaro/validation';

const schema = (production: boolean) =>
  z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4002),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Connection string for the RUNTIME role company_svc (never the migrator or a superuser). */
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: z.enum(['disable', 'require', 'verify-full']).default('disable'),
    DATABASE_SSL_CA: z.string().optional(),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    /** Public JWKS of the platform's token-signing keys, parsed to its key array (at least one in production). */
    AUTH_PUBLIC_JWKS: z
      .string()
      .default('{"keys":[]}')
      .pipe(production ? requiredPublicJwks : publicJwks),
    AUTH_ISSUER: z.string().default('saudaro-identity'),
    AUTH_AUDIENCE: z.string().default('saudaro-api'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  });

export type CompanyConfig = z.output<ReturnType<typeof schema>>;

export const loadConfig = (source: NodeJS.ProcessEnv = process.env): CompanyConfig => {
  const config = loadEnv(schema(source.NODE_ENV === 'production'), source);
  if (config.NODE_ENV === 'production' && config.DATABASE_SSL === 'disable') {
    throw new Error('Invalid environment configuration: DATABASE_SSL must not be "disable" in production');
  }
  return config;
};
