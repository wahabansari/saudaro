import type { Server } from 'node:http';
import type { Express } from 'express';
import type { Logger } from '@saudaro/logger';

export interface RunningService {
  server: Server;
  port: number;
  shutdown: () => Promise<void>;
}

/**
 * Starts listening with production-safe timeouts and wires GRACEFUL SHUTDOWN: stop accepting, let in-flight
 * requests finish, run cleanup hooks (pool.end, broker close), exit; force-exit after `shutdownTimeoutMs`.
 */
export async function serve(
  app: Express,
  opts: {
    host: string;
    port: number;
    logger: Logger;
    onShutdown?: () => Promise<void>;
    shutdownTimeoutMs?: number;
    /** Time /health/ready reports 503 before the server stops accepting, so load balancers deregister it (default 5 s). */
    drainDelayMs?: number;
    installSignalHandlers?: boolean;
  },
): Promise<RunningService> {
  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(opts.port, opts.host, () => resolve(s));
    s.once('error', reject);
  });
  // Keep-alive longer than typical load-balancer idle timeouts (60 s) to avoid sporadic 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 60_000;

  let closing: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    closing ??= (async () => {
      opts.logger.info('shutting down: draining connections');
      const timer = setTimeout(() => {
        opts.logger.error('forced shutdown after timeout');
        process.exit(1);
      }, opts.shutdownTimeoutMs ?? 15_000);
      timer.unref();
      app.locals.draining = true;
      await new Promise((resolve) => setTimeout(resolve, opts.drainDelayMs ?? 5_000));
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeIdleConnections();
      });
      await opts.onShutdown?.();
      clearTimeout(timer);
      opts.logger.info('shutdown complete');
    })();
    return closing;
  };

  if (opts.installSignalHandlers) {
    for (const sig of ['SIGINT', 'SIGTERM'] as const) {
      process.once(sig, () => {
        void shutdown().then(
          () => process.exit(0),
          () => process.exit(1),
        );
      });
    }
    process.on('unhandledRejection', (err) =>
      opts.logger.error({ err: { message: String((err as Error)?.message ?? err) } }, 'unhandled rejection'),
    );
  }

  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : opts.port;
  opts.logger.info({ host: opts.host, port }, 'listening');
  return { server, port, shutdown };
}
