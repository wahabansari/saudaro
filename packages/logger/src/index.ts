import { pino, type DestinationStream, type Logger, type LoggerOptions } from 'pino';

export type { Logger } from 'pino';

/** Paths redacted from every structured log line (headers, bodies, credentials, tokens). */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
  '*.authorization',
  'password',
  'token',
  'refreshToken',
  'accessToken',
];

export interface LoggerConfig {
  service: string;
  level?: string;
  /** Human-readable output (development only; requires pino-pretty to be installed). */
  pretty?: boolean;
  version?: string;
}

/** One logger factory for every process: JSON to stdout, redaction, service name on every line. */
export function createLogger(config: LoggerConfig, destination?: DestinationStream): Logger {
  const options: LoggerOptions = {
    level: config.level ?? 'info',
    base: { service: config.service, ...(config.version ? { version: config.version } : {}) },
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    ...(config.pretty ? { transport: { target: 'pino-pretty' } } : {}),
  };
  return destination ? pino(options, destination) : pino(options);
}

/** Never log raw driver errors: they can carry SQL detail such as "Key (email)=(x@y) already exists". */
export function safeError(err: unknown): { name: string; message: string; code?: string; stack?: string } {
  const e = err as { name?: string; message?: string; code?: string; stack?: string };
  return {
    name: e?.name ?? 'Error',
    message: e?.message ?? String(err),
    ...(e?.code ? { code: e.code } : {}),
    ...(e?.stack ? { stack: e.stack } : {}),
  };
}
