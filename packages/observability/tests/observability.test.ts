import { describe, expect, it } from 'vitest';
import { MetricsRegistry, currentTraceId, initTelemetry, traceHeaders } from '../src/index.ts';

describe('MetricsRegistry', () => {
  it('renders counters and gauges in Prometheus text format with escaped labels', () => {
    const m = new MetricsRegistry();
    const c = m.counter('http_requests_total', 'Requests', ['route', 'status']);
    c.inc({ route: '/graphql', status: '2xx' });
    c.inc({ route: '/graphql', status: '2xx' }, 2);
    c.inc({ route: 'a"b\\c', status: '5xx' });
    m.gauge('db_pool_in_use', 'In use', []).set(3);
    const out = m.render();
    expect(out).toContain('# TYPE http_requests_total counter');
    expect(out).toContain('http_requests_total{route="/graphql",status="2xx"} 3');
    expect(out).toContain('route="a\\"b\\\\c"');
    expect(out).toContain('db_pool_in_use 3');
  });

  it('renders cumulative histogram buckets, sum and count', () => {
    const m = new MetricsRegistry();
    const h = m.histogram('latency_seconds', 'Latency', ['route'], [0.1, 1]);
    h.observe(0.05, { route: 'r' });
    h.observe(0.5, { route: 'r' });
    h.observe(5, { route: 'r' });
    const out = m.render();
    expect(out).toContain('latency_seconds_bucket{route="r",le="0.1"} 1');
    expect(out).toContain('latency_seconds_bucket{route="r",le="1"} 2');
    expect(out).toContain('latency_seconds_bucket{route="r",le="+Inf"} 3');
    expect(out).toContain('latency_seconds_count{route="r"} 3');
    expect(out).toMatch(/latency_seconds_sum\{route="r"\} 5\.55/);
  });
});

describe('telemetry', () => {
  it('is a cheap no-op without an OTLP endpoint (tracing NOT exercised here — needs a collector)', async () => {
    const t = await initTelemetry({ serviceName: 'test' });
    expect(t.enabled).toBe(false);
    await expect(t.shutdown()).resolves.toBeUndefined();
  });
  it('has safe helpers when no span is active', () => {
    expect(currentTraceId()).toBeUndefined();
    expect(traceHeaders()).toEqual({});
  });
});
