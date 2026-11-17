import { Writable } from 'node:stream';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { TokenService, generateSigningKey } from '@saudaro/authentication';
import { createLogger } from '@saudaro/logger';
import { MetricsRegistry } from '@saudaro/observability';
import { createServiceApp, requireCaller, requireServiceAuth, serve } from '../src/index.ts';

const silent = () =>
  createLogger({ service: 'test', level: 'silent' }, new Writable({ write: (_c, _e, cb) => cb() }));

function build(over: Partial<Parameters<typeof createServiceApp>[0]> = {}) {
  const metrics = new MetricsRegistry();
  const app = createServiceApp({
    serviceName: 'demo-service',
    version: '1.2.3',
    logger: silent(),
    metrics,
    routes: (a) => {
      a.get('/things/:id', (req, res) => void res.json({ id: req.params.id }));
      a.post('/echo', (req, res) => void res.json(req.body));
      a.get('/slow', async (_req, res) => {
        await new Promise((r) => setTimeout(r, 300));
        if (!res.headersSent) res.json({});
      });
      a.get('/crash', () => {
        throw new Error('INSERT INTO secrets failed');
      });
    },
    ...over,
  });
  return { app, metrics };
}

describe('health, ids and headers', () => {
  it('serves liveness and readiness', async () => {
    const { app } = build();
    expect((await request(app).get('/health/live')).body).toEqual({
      status: 'ok',
      service: 'demo-service',
      version: '1.2.3',
    });
    expect((await request(app).get('/health/ready')).body.status).toBe('ready');
  });

  it('readiness fails closed with 503 and no internals when a dependency is down', async () => {
    const { app } = build({
      readiness: async () => {
        throw new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2');
      },
    });
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2|10\.0\.0\.5/);
  });

  it('propagates well-formed request/correlation ids and replaces hostile ones', async () => {
    const { app } = build();
    const ok = await request(app)
      .get('/health/live')
      .set('x-request-id', 'req-12345678')
      .set('x-correlation-id', 'corr-abcdefgh');
    expect([ok.headers['x-request-id'], ok.headers['x-correlation-id']]).toEqual([
      'req-12345678',
      'corr-abcdefgh',
    ]);
    const bad = await request(app).get('/health/live').set('x-request-id', 'bad id <script>');
    expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(bad.headers['x-correlation-id']).toBe(bad.headers['x-request-id']);
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(build().app).get('/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('error envelope', () => {
  it('404s unknown routes, rejects oversized and malformed bodies, hides internals', async () => {
    const { app } = build({ bodyLimit: '1kb' });
    const missing = await request(app).get('/nope');
    expect([missing.status, missing.body.error.code, missing.body.success]).toEqual([
      404,
      'ROUTE_NOT_FOUND',
      false,
    ]);
    const big = await request(app)
      .post('/echo')
      .send({ x: 'a'.repeat(5000) });
    expect([big.status, big.body.error.code]).toEqual([413, 'PAYLOAD_TOO_LARGE']);
    const bad = await request(app).post('/echo').set('content-type', 'application/json').send('{not json');
    expect([bad.status, bad.body.error.code]).toEqual([400, 'MALFORMED_JSON']);
    const crash = await request(app).get('/crash');
    expect(crash.status).toBe(500);
    expect(JSON.stringify(crash.body)).not.toContain('secrets');
    expect(crash.body.error.requestId).toBe(crash.headers['x-request-id']);
  });

  it('returns a 504 envelope when a request exceeds its deadline', async () => {
    const { app } = build({ requestTimeoutMs: 50 });
    const res = await request(app).get('/slow');
    expect([res.status, res.body.error.code, res.body.error.retryable]).toEqual([
      504,
      'REQUEST_TIMEOUT',
      true,
    ]);
  });
});

describe('metrics', () => {
  it('records requests by route TEMPLATE (never raw ids) and status class', async () => {
    const { app } = build();
    await request(app).get('/things/11111111-1111-4111-8111-111111111111');
    await request(app).get('/things/22222222-2222-4222-8222-222222222222');
    await request(app).get('/nope');
    const text = (await request(app).get('/metrics')).text;
    expect(text).toContain('http_requests_total{method="GET",route="/things/:id",status="2xx"} 2');
    expect(text).toContain('route="unmatched",status="4xx"');
    expect(text).not.toContain('11111111-1111');
    expect(text).toContain('http_request_duration_seconds_bucket');
  });
});

describe('service-to-service authentication', () => {
  it('accepts a token minted for this audience and rejects missing, foreign and user tokens', async () => {
    const key = await generateSigningKey('k1');
    const tokens = new TokenService({
      issuer: 'identity',
      audience: 'saudaro-api',
      signingKey: key,
      verificationKeys: [key.publicJwk],
    });
    const app = createServiceApp({
      serviceName: 'company-service',
      version: '0',
      logger: silent(),
      routes: (a) =>
        a.get(
          '/internal/ping',
          requireServiceAuth(tokens, 'company-service'),
          (req, res) => void res.json({ caller: req.serviceCaller }),
        ),
    });
    const good = await tokens.signServiceToken('api-gateway', 'company-service');
    expect((await request(app).get('/internal/ping').set('authorization', `Bearer ${good}`)).body).toEqual({
      caller: 'api-gateway',
    });
    expect((await request(app).get('/internal/ping')).status).toBe(401);
    const foreign = await tokens.signServiceToken('api-gateway', 'identity-service');
    expect((await request(app).get('/internal/ping').set('authorization', `Bearer ${foreign}`)).status).toBe(
      401,
    );
    const user = await tokens.signAccess({
      sub: '11111111-1111-4111-8111-111111111111',
      sid: '33333333-3333-4333-8333-333333333333',
      ver: 0,
    });
    expect((await request(app).get('/internal/ping').set('authorization', `Bearer ${user}`)).status).toBe(
      401,
    );
  });
});

describe('trust proxy', () => {
  const ipApp = (trustProxy?: boolean | number) =>
    build({
      ...(trustProxy === undefined ? {} : { trustProxy }),
      routes: (a) => a.get('/ip', (req, res) => void res.json({ ip: req.ip })),
    }).app;

  it('ignores X-Forwarded-For by default and honours it when trustProxy is set', async () => {
    const spoofed = (app: ReturnType<typeof ipApp>) =>
      request(app).get('/ip').set('x-forwarded-for', '203.0.113.7');
    expect((await spoofed(ipApp())).body.ip).not.toBe('203.0.113.7');
    expect((await spoofed(ipApp(1))).body.ip).toBe('203.0.113.7');
  });
});

describe('requireCaller', () => {
  it('allows only the named calling service, otherwise 403 CALLER_NOT_ALLOWED', async () => {
    const callerApp = createServiceApp({
      serviceName: 'identity-service',
      version: '0',
      logger: silent(),
      routes: (a) =>
        a.get(
          '/internal/ping',
          (req, _res, next) => {
            const svc = req.header('x-test-caller');
            if (svc) req.serviceCaller = svc;
            next();
          },
          requireCaller('api-gateway'),
          (_req, res) => void res.json({ ok: true }),
        ),
    });
    const ping = () => request(callerApp).get('/internal/ping');
    expect((await ping().set('x-test-caller', 'api-gateway')).status).toBe(200);
    for (const res of [await ping().set('x-test-caller', 'company-service'), await ping()])
      expect([res.status, res.body.error.code]).toEqual([403, 'CALLER_NOT_ALLOWED']);
  });
});

describe('graceful drain', () => {
  it('reports not ready while draining, before the server stops accepting', async () => {
    const svc = await serve(build().app, {
      host: '127.0.0.1',
      port: 0,
      logger: silent(),
      drainDelayMs: 300,
    });
    const url = `http://127.0.0.1:${svc.port}/health/ready`;
    expect((await fetch(url)).status).toBe(200);
    const done = svc.shutdown();
    await new Promise((r) => setTimeout(r, 50));
    expect((await fetch(url)).status).toBe(503);
    await done;
    await expect(fetch(url)).rejects.toThrow();
  });

  it('defaults the request deadline to 10 s', async () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    await request(build().app).get('/health/live');
    expect(spy.mock.calls.some(([, ms]) => ms === 10_000)).toBe(true);
    spy.mockRestore();
  });
});

describe('graceful shutdown', () => {
  it('stops accepting connections and runs cleanup hooks once', async () => {
    let cleaned = 0;
    const { app } = build();
    const svc = await serve(app, {
      host: '127.0.0.1',
      port: 0,
      logger: silent(),
      drainDelayMs: 0,
      onShutdown: async () => void (cleaned += 1),
    });
    const res = await fetch(`http://127.0.0.1:${svc.port}/health/live`);
    expect(res.status).toBe(200);
    await Promise.all([svc.shutdown(), svc.shutdown()]);
    expect(cleaned).toBe(1);
    await expect(fetch(`http://127.0.0.1:${svc.port}/health/live`)).rejects.toThrow();
  });
});
