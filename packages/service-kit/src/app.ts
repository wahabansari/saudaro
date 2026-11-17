import { randomUUID } from 'node:crypto';
import compression from 'compression';
import express, {
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import helmet from 'helmet';
import { DependencyError, createErrorMiddleware, notFoundHandler } from '@saudaro/error-handling';
import type { Logger } from '@saudaro/logger';
import { MetricsRegistry } from '@saudaro/observability';

const ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

export interface ServiceAppOptions {
  serviceName: string;
  version: string;
  logger: Logger;
  isDevelopment?: boolean;
  /** Throw to report "not ready" (database unreachable, unsafe DB role, broker down …). */
  readiness?: () => Promise<void>;
  metrics?: MetricsRegistry;
  /** Request body limit (default 100kb). */
  bodyLimit?: string;
  /** Per-request deadline; a slow handler gets a 504 envelope (default 10 s). */
  requestTimeoutMs?: number;
  /** Number of trusted reverse-proxy hops (or true) so req.ip reflects X-Forwarded-For (default false). */
  trustProxy?: boolean | number;
  /** Mount middleware that must run BEFORE routes (CORS, rate limiting). */
  beforeRoutes?: (app: Express) => void;
  /** Mount the service's own routes. */
  routes: (app: Express) => void;
}

/** Request id + correlation id: accepted only when well-formed (never trust header content), echoed back. */
export const requestContext: RequestHandler = (req, res, next) => {
  const supplied = req.header('x-request-id');
  req.id = supplied && ID_PATTERN.test(supplied) ? supplied : randomUUID();
  const corr = req.header('x-correlation-id');
  req.correlationId = corr && ID_PATTERN.test(corr) ? corr : req.id;
  res.setHeader('x-request-id', req.id);
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

function requestDeadline(ms: number): RequestHandler {
  return (_req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(
          new DependencyError('The request took too long. Please try again.', {
            httpStatus: 504,
            code: 'REQUEST_TIMEOUT',
          }),
        );
      }
    }, ms);
    timer.unref();
    const clear = () => clearTimeout(timer);
    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}

const statusClass = (code: number): string => `${Math.floor(code / 100)}xx`;

/**
 * The one Express application factory for the gateway and every service. Order matters:
 * context → security headers → compression → deadline → access log/metrics → health → body parsing →
 * (beforeRoutes) → routes → 404 → central error handler.
 */
export function createServiceApp(opts: ServiceAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', opts.trustProxy ?? false);
  const metrics = opts.metrics ?? new MetricsRegistry();
  const httpRequests = metrics.counter('http_requests_total', 'HTTP requests', ['method', 'route', 'status']);
  const httpLatency = metrics.histogram('http_request_duration_seconds', 'HTTP request latency', [
    'method',
    'route',
  ]);

  app.use(requestContext);
  app.use(helmet());
  app.use(compression());
  app.use(requestDeadline(opts.requestTimeoutMs ?? 10_000));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      // Route TEMPLATE (low cardinality) — never the raw path, which may contain ids.
      const route = req.route?.path ? `${req.baseUrl}${String(req.route.path)}` : 'unmatched';
      httpRequests.inc({ method: req.method, route, status: statusClass(res.statusCode) });
      httpLatency.observe(seconds, { method: req.method, route });
      opts.logger.info(
        {
          requestId: req.id,
          correlationId: req.correlationId,
          method: req.method,
          route,
          status: res.statusCode,
          durationMs: Math.round(seconds * 1000),
        },
        'request completed',
      );
    });
    next();
  });

  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', service: opts.serviceName, version: opts.version });
  });
  app.get('/health/ready', async (req, res) => {
    try {
      if (app.locals.draining) {
        res.status(503).json({ status: 'draining', service: opts.serviceName });
        return;
      }
      await opts.readiness?.();
      res.json({ status: 'ready', service: opts.serviceName, version: opts.version });
    } catch (err) {
      opts.logger.error(
        { requestId: req.id, err: { message: (err as Error).message } },
        'readiness check failed',
      );
      res.status(503).json({ status: 'unavailable', service: opts.serviceName });
    }
  });
  app.get('/metrics', (_req, res) => {
    res.type('text/plain; version=0.0.4').send(metrics.render());
  });

  app.use(express.json({ limit: opts.bodyLimit ?? '100kb' }));
  opts.beforeRoutes?.(app);
  opts.routes(app);

  app.use(notFoundHandler);
  app.use(
    createErrorMiddleware({ logger: opts.logger, ...(opts.isDevelopment ? { isDevelopment: true } : {}) }),
  );
  return app;
}
