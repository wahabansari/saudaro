import type { Express } from 'express';
import { loginInput, logoutInput, refreshInput, registerInput } from '@saudaro/api-contracts';
import type { TokenService } from '@saudaro/authentication';
import { asyncHandler } from '@saudaro/error-handling';
import { requireCaller, requireServiceAuth } from '@saudaro/service-kit';
import { parseInput } from '@saudaro/validation';
import { HEADERS } from '@saudaro/api-contracts';
import type { AuthService } from '../application/auth-service.ts';

const GATEWAY = 'api-gateway';

/** `/v1/auth/*` is internal (called by the gateway with a service token); only the gateway may call it. Only the JWKS is public. */
export function mountRoutes(app: Express, deps: { auth: AuthService; tokens: TokenService; serviceName: string }): void {
  const { auth, tokens } = deps;
  const internal = [requireServiceAuth(tokens, deps.serviceName), requireCaller(GATEWAY)];

  app.get('/.well-known/jwks.json', (_req, res) => {
    res.json(tokens.jwks());
  });
  app.post(
    '/v1/auth/register',
    internal,
    asyncHandler(async (req, res) => {
      await auth.register(parseInput(registerInput, req.body));
      res.status(202).json({});
    }),
  );
  app.post(
    '/v1/auth/login',
    internal,
    asyncHandler(async (req, res) => {
      res.json(await auth.login(parseInput(loginInput, req.body)));
    }),
  );
  app.post(
    '/v1/auth/refresh',
    internal,
    asyncHandler(async (req, res) => {
      res.json(
        await auth.refresh(parseInput(refreshInput, req.body), {
          [HEADERS.requestId]: req.id,
          [HEADERS.correlationId]: req.correlationId,
        }),
      );
    }),
  );
  app.post(
    '/v1/auth/logout',
    internal,
    asyncHandler(async (req, res) => {
      await auth.logout(parseInput(logoutInput, req.body));
      res.status(204).end();
    }),
  );
}
