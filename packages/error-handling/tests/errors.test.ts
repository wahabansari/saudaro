import { Writable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { createLogger } from '@saudaro/logger';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  BusinessRuleError,
  ConflictError,
  DependencyError,
  InternalServerError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  asyncHandler,
  createErrorMiddleware,
  formatGraphQLError,
  normalizeError,
  notFoundHandler,
  toErrorBody,
  toGraphQLError,
} from '../src/index.ts';

describe('error classes', () => {
  it.each([
    [new ValidationError(), 400, 'VALIDATION_ERROR', false],
    [new AuthenticationError(), 401, 'AUTHENTICATION_ERROR', false],
    [new AuthorizationError(), 403, 'AUTHORIZATION_ERROR', false],
    [new NotFoundError(), 404, 'NOT_FOUND', false],
    [new ConflictError(), 409, 'CONFLICT', false],
    [new BusinessRuleError(), 422, 'BUSINESS_RULE_VIOLATION', false],
    [new RateLimitError(undefined, { retryAfterSeconds: 3 }), 429, 'RATE_LIMITED', true],
    [new DependencyError(), 503, 'DEPENDENCY_ERROR', true],
    [new InternalServerError(), 500, 'INTERNAL_ERROR', false],
  ])('%s has stable status/code/retryable classification', (err, status, code, retryable) => {
    expect(err).toBeInstanceOf(AppError);
    expect([err.httpStatus, err.code, err.retryable]).toEqual([status, code, retryable]);
  });

  it('allows a stable specific code (COMPANY_ACCESS_DENIED) without changing the class', () => {
    const err = new AuthorizationError('You do not have permission to access this company.', {
      code: 'COMPANY_ACCESS_DENIED',
    });
    expect(err.code).toBe('COMPANY_ACCESS_DENIED');
    expect(err.httpStatus).toBe(403);
  });
});

describe('normalizeError', () => {
  it('maps Zod issues to field-level validation details', () => {
    const zodLike = Object.assign(new Error('x'), {
      name: 'ZodError',
      issues: [{ path: ['email'], message: 'Invalid email', code: 'invalid_string' }],
    });
    const err = normalizeError(zodLike);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details).toEqual([{ field: 'email', message: 'Invalid email', code: 'invalid_string' }]);
  });

  it.each([
    ['23505', 409, 'CONFLICT'],
    ['23503', 409, 'INVALID_REFERENCE'],
    ['23514', 422, 'INVALID_DATA'],
    ['42501', 403, 'AUTHORIZATION_ERROR'],
    ['40001', 409, 'CONCURRENT_MODIFICATION'],
    ['57014', 503, 'DEPENDENCY_ERROR'],
    ['ECONNREFUSED', 503, 'DEPENDENCY_ERROR'],
  ])('maps SQLSTATE/network code %s', (code, status, mapped) => {
    const err = normalizeError(Object.assign(new Error('raw driver text with table "users"'), { code }));
    expect([err.httpStatus, err.code]).toEqual([status, mapped]);
    expect(err.message).not.toMatch(/users|driver/);
  });

  it('classifies retryable vs non-retryable', () => {
    expect(normalizeError(Object.assign(new Error(), { code: '40001' })).retryable).toBe(true);
    expect(normalizeError(Object.assign(new Error(), { code: '23505' })).retryable).toBe(false);
    expect(normalizeError(new Error('boom')).retryable).toBe(false);
  });

  it('turns unknown errors into a generic InternalServerError and keeps the cause server-side', () => {
    const original = new Error('SELECT * FROM secrets failed');
    const err = normalizeError(original);
    expect(err).toBeInstanceOf(InternalServerError);
    expect(err.message).not.toContain('secrets');
    expect(err.cause).toBe(original);
  });

  it('maps oversized and malformed bodies', () => {
    expect(normalizeError(Object.assign(new Error(), { type: 'entity.too.large' })).httpStatus).toBe(413);
    expect(normalizeError(Object.assign(new Error(), { type: 'entity.parse.failed' })).code).toBe(
      'MALFORMED_JSON',
    );
  });
});

describe('REST envelope', () => {
  it('has the platform shape and omits stack unless asked', () => {
    const body = toErrorBody(new NotFoundError('Company not found.'), {
      requestId: 'req_1',
      now: new Date('2026-11-17T10:00:00Z'),
    });
    expect(body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Company not found.',
        details: [],
        retryable: false,
        requestId: 'req_1',
        timestamp: '2026-11-17T10:00:00.000Z',
      },
    });
    expect(
      toErrorBody(new InternalServerError(), { requestId: 'r', includeStack: true }).error.stack,
    ).toBeDefined();
  });
});

describe('GraphQL errors', () => {
  const ctx = { requestId: 'req_9' };
  it('toGraphQLError carries stable extensions', () => {
    const e = toGraphQLError(new AuthorizationError('nope', { code: 'COMPANY_ACCESS_DENIED' }), 'req_9');
    expect(e.extensions).toMatchObject({
      code: 'COMPANY_ACCESS_DENIED',
      requestId: 'req_9',
      retryable: false,
    });
  });

  it('formats AppErrors, GraphQL validation errors and unknown errors consistently', () => {
    const app = formatGraphQLError(new GraphQLError('x').toJSON(), new ConflictError('Already exists.'), ctx);
    expect(app.extensions).toMatchObject({ code: 'CONFLICT', requestId: 'req_9', http: { status: 409 } });

    const validation = formatGraphQLError(
      new GraphQLError('Cannot query field "foo"', {
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      }).toJSON(),
      new GraphQLError('Cannot query field "foo"'),
      ctx,
    );
    expect(validation.extensions?.code).toBe('VALIDATION_ERROR');

    const unknown = formatGraphQLError(
      new GraphQLError('relation "users" does not exist').toJSON(),
      new Error('relation "users" does not exist'),
      ctx,
    );
    expect(unknown.message).not.toContain('users');
    expect(unknown.extensions).toMatchObject({ code: 'INTERNAL_ERROR', requestId: 'req_9' });
    expect(unknown.extensions).not.toHaveProperty('stacktrace');
  });

  it('exposes stack traces only when asked (development)', () => {
    const f = formatGraphQLError(new GraphQLError('x').toJSON(), new Error('boom'), {
      requestId: 'r',
      exposeStack: true,
    });
    expect(f.extensions).toHaveProperty('stacktrace');
  });
});

describe('Express middleware', () => {
  function app(isDevelopment = false) {
    const lines: string[] = [];
    const sink = new Writable({ write: (c, _e, cb) => (lines.push(String(c)), cb()) });
    const logger = createLogger({ service: 'test' }, sink);
    const a = express();
    a.use((req, _res, next) => ((req.id = 'req_t'), (req.correlationId = 'corr_t'), next()));
    a.get(
      '/boom',
      asyncHandler(async () => {
        throw Object.assign(new Error('INSERT INTO users failed: Key (email)=(a@b.c)'), {
          code: '23505',
          detail: 'Key (email)=(a@b.c)',
        });
      }),
    );
    a.get('/denied', () => {
      throw new AuthorizationError('You do not have permission to access this company.', {
        code: 'COMPANY_ACCESS_DENIED',
      });
    });
    a.get('/limited', () => {
      throw new RateLimitError(undefined, { retryAfterSeconds: 7 });
    });
    a.get('/crash', () => {
      throw new Error('secret internal detail');
    });
    a.use(notFoundHandler);
    a.use(createErrorMiddleware({ logger, isDevelopment }));
    return { a, lines };
  }

  it('returns the standard envelope without leaking SQL or driver detail', async () => {
    const { a, lines } = app();
    const res = await request(a).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, error: { code: 'CONFLICT', requestId: 'req_t' } });
    expect(JSON.stringify(res.body)).not.toMatch(/INSERT|users|a@b\.c/);
    expect(lines.join('')).not.toContain('a@b.c'); // not even in logs
  });

  it('maps authorization errors, rate limits (Retry-After) and unknown routes', async () => {
    const { a } = app();
    expect((await request(a).get('/denied')).body.error.code).toBe('COMPANY_ACCESS_DENIED');
    const limited = await request(a).get('/limited');
    expect([limited.status, limited.headers['retry-after']]).toEqual([429, '7']);
    const missing = await request(a).get('/nope');
    expect([missing.status, missing.body.error.code]).toEqual([404, 'ROUTE_NOT_FOUND']);
  });

  it('hides internals and stack in production, shows stack in development only', async () => {
    const prod = await request(app(false).a).get('/crash');
    expect(prod.status).toBe(500);
    expect(prod.body.error.message).not.toContain('secret');
    expect(prod.body.error.stack).toBeUndefined();
    const dev = await request(app(true).a).get('/crash');
    expect(dev.body.error.stack).toBeDefined();
  });
});
