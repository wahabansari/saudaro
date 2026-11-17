import { parse, validate, buildSchema } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { depthLimitRule } from '../../src/graphql/depth-limit.ts';
import { connectionEstimator } from '../../src/plugins/operations.ts';
import { persistedQueries } from '../../src/security/persisted-queries.ts';
import { requireAuth, type GatewayContext } from '../../src/context/context.ts';
import { AuthenticationError } from '@saudaro/error-handling';

const schema = buildSchema(`
  type Node { child: Node, name: String }
  type Query { node: Node, nodes(first: Int): [Node] }
`);
const errorsFor = (query: string, max: number) => validate(schema, parse(query), [depthLimitRule(max)]).map((e) => e.extensions?.code);

describe('depth limit', () => {
  it('counts nesting, expands fragments, ignores introspection', () => {
    expect(errorsFor('{ node { child { name } } }', 3)).toEqual([]);
    expect(errorsFor('{ node { child { name } } }', 2)).toEqual(['QUERY_TOO_DEEP']);
    expect(errorsFor('query { node { ...F } } fragment F on Node { child { child { name } } }', 3)).toEqual(['QUERY_TOO_DEEP']);
    expect(errorsFor('{ __schema { types { name } } }', 1)).toEqual([]);
  });
  it('handles inline fragments and cyclic fragment spreads safely', () => {
    expect(errorsFor('{ node { ... on Node { child { name } } } }', 3)).toEqual([]);
    expect(() => errorsFor('query { node { ...A } } fragment A on Node { child { ...A } }', 50)).not.toThrow();
  });
});

describe('connection cost estimator', () => {
  it('prices lists by page size × child cost', () => {
    expect(connectionEstimator({ args: { first: 50 }, childComplexity: 3 })).toBe(151);
    expect(connectionEstimator({ args: {}, childComplexity: 3 })).toBeUndefined();
  });
});

describe('persistedQueries middleware', () => {
  const run = (mw: ReturnType<typeof persistedQueries>, req: Record<string, unknown>) => {
    const next = vi.fn();
    mw(req as never, {} as never, next);
    return next;
  };
  const mw = persistedQueries({ allowlist: new Map([['abc', 'query A { a }']]), enforce: true });

  it('replaces the query with allowlisted text and rejects others in enforce mode', () => {
    const req = { method: 'POST', body: { query: 'evil', extensions: { persistedQuery: { sha256Hash: 'ABC' } } } };
    run(mw, req);
    expect(req.body.query).toBe('query A { a }');
    expect(run(mw, { method: 'POST', body: { query: '{ a }' } }).mock.calls[0]?.[0]).toMatchObject({ code: 'PERSISTED_QUERY_REQUIRED' });
  });
  it('lets non-POST requests through to Apollo (CSRF rules apply there)', () => {
    expect(run(mw, { method: 'GET', body: undefined }).mock.calls[0]).toEqual([]);
  });
});

describe('auth guards', () => {
  const base = { requestId: 'r', correlationId: 'c', logger: undefined as never, authError: null, accessToken: undefined, services: undefined as never };
  const claims = { sub: 'u', sid: 's', ver: 0, perms: ['rfq.create'], amr: [], cid: 'c1' };
  it('requireAuth returns the claims or throws an authentication error', () => {
    expect(() => requireAuth({ ...base, claims: null } as GatewayContext)).toThrow(AuthenticationError);
    expect(requireAuth({ ...base, claims } as GatewayContext)).toBe(claims);
  });
});
