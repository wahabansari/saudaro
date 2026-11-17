import { assertSafeRuntimeRole, createPool } from '@saudaro/database-utils';
import { createLogger } from '@saudaro/logger';
import { initTelemetry } from '@saudaro/observability';
import { serve } from '@saudaro/service-kit';
import { buildApp, SERVICE_NAME, SERVICE_VERSION } from './app.ts';
import { loadConfig } from './config/env.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const telemetry = await initTelemetry({
    serviceName: SERVICE_NAME,
    serviceVersion: SERVICE_VERSION,
    otlpEndpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
  const logger = createLogger({ service: SERVICE_NAME, level: config.LOG_LEVEL, version: SERVICE_VERSION });
  const pool = createPool(config.DATABASE_URL, {
    max: config.DB_POOL_MAX,
    ssl: config.DATABASE_SSL,
    ...(config.DATABASE_SSL_CA ? { sslCa: config.DATABASE_SSL_CA } : {}),
    applicationName: SERVICE_NAME,
  });

  // Refuse to serve with a role that could bypass row-level security or alter its own schema.
  const role = await assertSafeRuntimeRole(pool);
  logger.info({ role }, 'database runtime role verified');

  await serve(buildApp({ config, logger, pool }), {
    host: config.HOST,
    port: config.PORT,
    logger,
    installSignalHandlers: true,
    onShutdown: async () => {
      await pool.end();
      await telemetry.shutdown();
    },
  });
}

main().catch((err: unknown) => {
  process.stderr.write(
    `${SERVICE_NAME} startup failed: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
