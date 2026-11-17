import { describe, expect, it } from 'vitest';
import { loadGatewayConfig } from '../../src/config/env.ts';

const KEY = { kty: 'OKP', kid: 'k1' };

describe('AUTH_PUBLIC_JWKS', () => {
  it('is parsed into a key array; development may have none', () => {
    expect(loadGatewayConfig({ AUTH_PUBLIC_JWKS: JSON.stringify({ keys: [KEY] }) }).AUTH_PUBLIC_JWKS).toEqual([KEY]);
    expect(loadGatewayConfig({}).AUTH_PUBLIC_JWKS).toEqual([]);
  });

  it('production requires at least one key', () => {
    expect(() => loadGatewayConfig({ NODE_ENV: 'production' })).toThrow(/AUTH_PUBLIC_JWKS/);
    expect(() => loadGatewayConfig({ NODE_ENV: 'production', AUTH_PUBLIC_JWKS: '{"keys":[]}' })).toThrow(/at least one key/);
    expect(loadGatewayConfig({ NODE_ENV: 'production', AUTH_PUBLIC_JWKS: JSON.stringify({ keys: [KEY] }) }).AUTH_PUBLIC_JWKS).toEqual([KEY]);
  });

  it('an invalid value fails at startup without echoing it', () => {
    expect(() => loadGatewayConfig({ AUTH_PUBLIC_JWKS: 'super-secret-garbage' })).toThrow(/AUTH_PUBLIC_JWKS/);
    expect(() => loadGatewayConfig({ AUTH_PUBLIC_JWKS: 'super-secret-garbage' })).not.toThrow(/super-secret-garbage/);
  });
});

describe('TRUST_PROXY', () => {
  it('defaults to 0 (off) and accepts a hop count', () => {
    expect(loadGatewayConfig({}).TRUST_PROXY).toBe(0);
    expect(loadGatewayConfig({ TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
  });
});
