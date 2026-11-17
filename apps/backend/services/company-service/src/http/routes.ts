import { Router, type Express, type RequestHandler } from 'express';
import type pg from 'pg';
import { createCompanyInput, HEADERS, type MembershipLookupResponse } from '@saudaro/api-contracts';
import { permissionsFor } from '@saudaro/authorization';
import type { TokenService } from '@saudaro/authentication';
import { asyncHandler, AuthenticationError, NotFoundError } from '@saudaro/error-handling';
import { requireCaller, requireServiceAuth } from '@saudaro/service-kit';
import { parseInput, uuid } from '@saudaro/validation';
import { createCompany, findMembership, listMyCompanies } from '../infrastructure/repositories/companies.ts';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

const requireUser = (tokens: TokenService): RequestHandler =>
  asyncHandler(async (req, _res, next) => {
    const token = req.header(HEADERS.userToken);
    if (!token)
      throw new AuthenticationError('User authentication is required.', { code: 'USER_AUTH_REQUIRED' });
    req.userId = (await tokens.verifyAccess(token)).sub;
    next();
  });

export function mountRoutes(
  app: Express,
  deps: { pool: pg.Pool; tokens: TokenService; serviceName: string },
): void {
  const { pool, tokens } = deps;
  const service = requireServiceAuth(tokens, deps.serviceName);

  const v1 = Router();
  v1.use(service, requireCaller('api-gateway'), requireUser(tokens));
  v1.post(
    '/companies',
    asyncHandler(async (req, res) => {
      const input = parseInput(createCompanyInput, req.body);
      res
        .status(201)
        .json(await createCompany(pool, { ...input, userId: req.userId!, correlationId: req.correlationId }));
    }),
  );
  v1.get(
    '/companies/mine',
    asyncHandler(async (req, res) => {
      res.json(await listMyCompanies(pool, req.userId!));
    }),
  );
  app.use('/v1', v1);

  app.get(
    '/internal/memberships/:companyId/:userId',
    service,
    requireCaller('identity-service'),
    asyncHandler(async (req, res) => {
      const companyId = parseInput(uuid, req.params.companyId);
      const userId = parseInput(uuid, req.params.userId);
      const row = await findMembership(pool, companyId, userId);
      if (!row) throw new NotFoundError('Membership was not found.', { code: 'MEMBERSHIP_NOT_FOUND' });
      const body: MembershipLookupResponse = {
        userId,
        companyId,
        status: row.status as MembershipLookupResponse['status'],
        roleKey: row.roleKey,
        permissions: [...permissionsFor(row.roleKey)],
      };
      res.json(body);
    }),
  );
}
