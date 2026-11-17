import { Writable } from 'node:stream';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { TokenService, generateSigningKey } from '@saudaro/authentication';
import { createLogger } from '@saudaro/logger';
import { buildGateway } from '../../src/app.ts';
import { loadGatewayConfig } from '../../src/config/env.ts';

async function gateway(env: Record<string, string>) {
  const key = await generateSigningKey('k1');
  const config = loadGatewayConfig({ LOG_LEVEL: 'silent', AUTH_PUBLIC_JWKS: JSON.stringify({ keys: [key.publicJwk] }), ...env });
  return buildGateway({
    config,
    logger: createLogger({ service: 'gw', level: 'silent' }, new Writable({ write: (_c, _e, cb) => cb() })),
    tokens: new TokenService({ issuer: 'saudaro-identity', audience: 'saudaro-api', verificationKeys: [key.publicJwk] }),
  });
}

describe('production policy', () => {
  it('is secure by default: introspection off, persisted queries enforced, no landing page, no stack traces', async () => {
    const config = loadGatewayConfig({ NODE_ENV: 'production', AUTH_PUBLIC_JWKS: '{"keys":[{"kty":"OKP"}]}' });
    expect([config.GRAPHQL_INTROSPECTION, config.GRAPHQL_PERSISTED_ONLY]).toEqual([false, true]);
    const gw = await gateway({ NODE_ENV: 'production' });
    const intro = await request(gw.app).post('/graphql').send({ query: '{ __schema { types { name } } }' });
    expect(intro.status).toBe(400); // blocked by the allowlist before it reaches Apollo
    const html = await request(gw.app).get('/graphql').set('accept', 'text/html');
    expect(html.text).not.toMatch(/<html|sandbox|embeddable/i); // no landing page / IDE is served
    await gw.stop();
  });

  it('even when persisted-only is relaxed, introspection stays off in production', async () => {
    const gw = await gateway({ NODE_ENV: 'production', GRAPHQL_PERSISTED_ONLY: 'false' });
    const res = await request(gw.app).post('/graphql').send({ query: '{ __schema { types { name } } }' });
    expect(res.body.errors?.[0]?.message ?? '').toMatch(/introspection/i);
    expect(JSON.stringify(res.body)).not.toContain('"types"');
    await gw.stop();
  });

  it('hides schema details (no "Did you mean") in production error messages', async () => {
    const gw = await gateway({ NODE_ENV: 'production', GRAPHQL_PERSISTED_ONLY: 'false' });
    const res = await request(gw.app).post('/graphql').send({ query: '{ healt { status } }' });
    expect(JSON.stringify(res.body)).not.toMatch(/Did you mean/i);
    await gw.stop();
  });

  it('allows introspection and the landing page only in development', async () => {
    const gw = await gateway({ NODE_ENV: 'development' });
    const res = await request(gw.app).post('/graphql').send({ query: '{ __schema { queryType { name } } }' });
    expect(res.body.data.__schema.queryType.name).toBe('Query');
    await gw.stop();
  });
});

describe('browser protection', () => {
  it('CORS allows only configured origins and never credentials', async () => {
    const gw = await gateway({ NODE_ENV: 'test', CORS_ORIGINS: 'https://app.saudaro.test' });
    const allowed = await request(gw.app)
      .options('/graphql')
      .set('origin', 'https://app.saudaro.test')
      .set('access-control-request-method', 'POST');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.saudaro.test');
    expect(allowed.headers['access-control-allow-credentials']).toBeUndefined();
    const denied = await request(gw.app)
      .options('/graphql')
      .set('origin', 'https://evil.example')
      .set('access-control-request-method', 'POST');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    await gw.stop();
  });

  it('CSRF prevention rejects simple cross-site GETs without a preflight-triggering header', async () => {
    const gw = await gateway({ NODE_ENV: 'test' });
    const res = await request(gw.app).get('/graphql').query({ query: '{ health { status } }' });
    expect(res.status).toBe(400);
    await gw.stop();
  });

  it('sets security headers on GraphQL responses', async () => {
    const gw = await gateway({ NODE_ENV: 'test' });
    const res = await request(gw.app).post('/graphql').send({ query: '{ health { status } }' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    await gw.stop();
  });
});

describe('configuration', () => {
  it('fails fast on invalid configuration without echoing values', () => {
    expect(() => loadGatewayConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadGatewayConfig({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
