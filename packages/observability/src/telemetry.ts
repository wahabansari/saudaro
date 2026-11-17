import { context, propagation, trace } from '@opentelemetry/api';

export interface TelemetryOptions {
  serviceName: string;
  serviceVersion?: string;
  /** OTLP/HTTP base URL of the collector, e.g. http://localhost:4318. Unset ⇒ tracing disabled (no-op). */
  otlpEndpoint?: string | undefined;
}

export interface Telemetry {
  enabled: boolean;
  shutdown: () => Promise<void>;
}

/**
 * Starts OpenTelemetry tracing when an OTLP endpoint is configured (HTTP, Express and pg instrumentation).
 * Without an endpoint this is a cheap no-op, so unit tests and local runs need no collector. Call BEFORE
 * importing express/pg in the entry point so instrumentation can patch them.
 */
export async function initTelemetry(opts: TelemetryOptions): Promise<Telemetry> {
  if (!opts.otlpEndpoint) return { enabled: false, shutdown: async () => undefined };
  const [
    { NodeSDK },
    { OTLPTraceExporter },
    { HttpInstrumentation },
    { ExpressInstrumentation },
    { PgInstrumentation },
    { resourceFromAttributes },
  ] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/instrumentation-http'),
    import('@opentelemetry/instrumentation-express'),
    import('@opentelemetry/instrumentation-pg'),
    import('@opentelemetry/resources'),
  ]);
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': opts.serviceName,
      ...(opts.serviceVersion ? { 'service.version': opts.serviceVersion } : {}),
    }),
    traceExporter: new OTLPTraceExporter({ url: `${opts.otlpEndpoint.replace(/\/$/, '')}/v1/traces` }),
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation(), new PgInstrumentation()],
  });
  sdk.start();
  return { enabled: true, shutdown: () => sdk.shutdown() };
}

/** Headers (traceparent/tracestate) to attach to outgoing HTTP/broker messages so traces span services. */
export function traceHeaders(): Record<string, string> {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

/** Current trace id for log correlation, if a span is active. */
export function currentTraceId(): string | undefined {
  const id = trace.getActiveSpan()?.spanContext().traceId;
  return id && /^[0-9a-f]{32}$/.test(id) && id !== '0'.repeat(32) ? id : undefined;
}
