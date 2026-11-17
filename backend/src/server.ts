import { buildApp } from './app.ts';
import { loadEnv } from './config/env.ts';
import { assertSafeRuntimeRole } from './database/client.ts';

const SHUTDOWN_TIMEOUT_MS = 15_000;

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp({ env });

  // Refuse to serve traffic with a role that could bypass tenant isolation.
  const role = await assertSafeRuntimeRole(app.pool);
  app.log.info({ role }, 'database runtime role verified');

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'shutting down');
    const timer = setTimeout(() => {
      app.log.error('forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    timer.unref();
    try {
      await app.close(); // stops accepting, drains in-flight requests, ends the pool
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => app.log.error({ err }, 'unhandled rejection'));

  await app.listen({ host: env.HOST, port: env.PORT });
}

main().catch((err: unknown) => {
  // Logger may not exist yet (e.g. invalid env); write a single safe line.
  process.stderr.write(`startup failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
