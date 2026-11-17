import {
  authPayloadSchema,
  companySchema,
  createCompanyInput,
  loginInput,
  logoutInput,
  refreshInput,
  registerInput,
} from '@saudaro/api-contracts';
import { z } from '@saudaro/validation';
import { GATEWAY_VERSION } from '../config/env.ts';
import type { GatewayContext } from '../context/context.ts';
import { requireAuth } from '../context/context.ts';

const SERVICE = 'api-gateway';
const VERSION = GATEWAY_VERSION;

const identity = (ctx: GatewayContext, path: string, body: unknown) =>
  ({ service: 'identity-service', method: 'POST', path: `/v1/auth/${path}`, requestId: ctx.requestId, correlationId: ctx.correlationId, body }) as const;

/**
 * Resolvers are THIN: authenticate/authorise, validate, call a typed service client, shape the result.
 * No SQL and no business rules live here (ADR-002).
 */
export const resolvers = {
  Query: {
    health: () => ({ status: 'ok', service: SERVICE, version: VERSION, time: new Date().toISOString() }),
    viewer: (_root: unknown, _args: unknown, ctx: GatewayContext) => {
      const claims = requireAuth(ctx);
      return { userId: claims.sub, companyId: claims.cid ?? null, permissions: claims.perms };
    },
    myCompanies: (_root: unknown, _args: unknown, ctx: GatewayContext) => {
      requireAuth(ctx);
      return ctx.services.call({
        service: 'company-service',
        method: 'GET',
        path: '/v1/companies/mine',
        requestId: ctx.requestId, correlationId: ctx.correlationId,
        userToken: ctx.accessToken,
        schema: z.array(companySchema),
      });
    },
  },
  Mutation: {
    register: async (_root: unknown, args: { input: unknown }, ctx: GatewayContext) => {
      await ctx.services.call(identity(ctx, 'register', registerInput.parse(args.input)));
      return true;
    },
    login: (_root: unknown, args: { input: unknown }, ctx: GatewayContext) =>
      ctx.services.call({ ...identity(ctx, 'login', loginInput.parse(args.input)), schema: authPayloadSchema }),
    refresh: (_root: unknown, args: { refreshToken: string; companyId?: string | null }, ctx: GatewayContext) =>
      ctx.services.call({
        ...identity(ctx, 'refresh', refreshInput.parse({ refreshToken: args.refreshToken, companyId: args.companyId ?? undefined })),
        schema: authPayloadSchema,
      }),
    logout: async (_root: unknown, args: { refreshToken: string }, ctx: GatewayContext) => {
      await ctx.services.call(identity(ctx, 'logout', logoutInput.parse(args)));
      return true;
    },
    createCompany: (_root: unknown, args: { input: unknown }, ctx: GatewayContext) => {
      requireAuth(ctx);
      return ctx.services.call({
        service: 'company-service',
        method: 'POST',
        path: '/v1/companies',
        requestId: ctx.requestId, correlationId: ctx.correlationId,
        body: createCompanyInput.parse(args.input),
        userToken: ctx.accessToken,
        schema: companySchema,
      });
    },
  },
};
