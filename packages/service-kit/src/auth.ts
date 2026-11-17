import type { RequestHandler } from 'express';
import { AuthenticationError, AuthorizationError } from '@saudaro/error-handling';
import type { TokenService } from '@saudaro/authentication';

declare module 'express-serve-static-core' {
  interface Request {
    /** Name of the calling service, set by requireServiceAuth. */
    serviceCaller?: string;
  }
}

/**
 * Protects INTERNAL routes: the caller must present a valid, short-lived service token whose audience is
 * this service. End-user tokens and tokens minted for other services are rejected.
 */
export function requireServiceAuth(tokens: TokenService, audience: string): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.header('authorization');
      const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
      if (!token)
        throw new AuthenticationError('Service authentication is required.', {
          code: 'SERVICE_AUTH_REQUIRED',
        });
      req.serviceCaller = (await tokens.verifyServiceToken(token, audience)).svc;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Pins WHICH service may call a route group; mount after requireServiceAuth (which proves the token is valid). */
export function requireCaller(allowedServiceName: string): RequestHandler {
  return (req, _res, next) =>
    next(
      req.serviceCaller === allowedServiceName
        ? undefined
        : new AuthorizationError('This caller is not allowed.', { code: 'CALLER_NOT_ALLOWED' }),
    );
}
