import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Services that own a database schema. Add an entry when a service is implemented. */
export const DB_SERVICES = [
  { name: 'identity', schema: 'identity', dir: 'apps/backend/services/identity-service', port: 4001 },
  { name: 'company', schema: 'company', dir: 'apps/backend/services/company-service', port: 4002 },
] as const;

export const GATEWAY = {
  name: 'api-gateway',
  dir: 'apps/backend/api-gateway',
  port: 4000,
  entry: 'src/server.ts',
} as const;

export type DbService = (typeof DB_SERVICES)[number];

const isProd = process.env.NODE_ENV === 'production';

/** Local-only development credentials. In production every value MUST come from the environment. */
function fromEnv(name: string, devDefault: string): string {
  const v = process.env[name];
  if (v) return v;
  if (isProd) throw new Error(`${name} must be set in production`);
  return devDefault;
}

/** Superuser URL — used ONLY by db:bootstrap (never by a service). Matches docker-compose.yml. */
export const adminUrl = (): string =>
  fromEnv('DATABASE_ADMIN_URL', 'postgres://admin:root123@127.0.0.1:5432/saudaro_marketplace');

export const dbName = (): string => new URL(adminUrl()).pathname.replace(/^\//, '');

export function passwords(s: Pick<DbService, 'name'>): { app: string; migrator: string } {
  const key = s.name.toUpperCase();
  return {
    app: fromEnv(`${key}_SVC_PASSWORD`, `${s.name}_svc_dev_pass`),
    migrator: fromEnv(`${key}_MIGRATOR_PASSWORD`, `${s.name}_migrator_dev_pass`),
  };
}

/** Connection URL for a service role against the same host/database as the admin URL. */
export function roleUrl(s: Pick<DbService, 'name'>, kind: 'app' | 'migrator'): string {
  const u = new URL(adminUrl());
  u.username = kind === 'app' ? `${s.name}_svc` : `${s.name}_migrator`;
  u.password = passwords(s)[kind];
  return u.toString();
}

export const migrationsFolder = (s: Pick<DbService, 'dir'>): string => join(ROOT, s.dir, 'migrations');
