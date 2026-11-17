import { HEADERS } from '@saudaro/api-contracts';
import type { TokenService } from '@saudaro/authentication';
import {
  type AppError,
  AuthenticationError,
  AuthorizationError,
  BusinessRuleError,
  ConflictError,
  DependencyError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  type AppErrorOptions,
} from '@saudaro/error-handling';
import { z } from '@saudaro/validation';
import type { GatewayConfig } from '../config/env.ts';

/** Downstream calls get less than the whole request deadline, so a slow service yields a DependencyError, not a bare REQUEST_TIMEOUT. */
const DOWNSTREAM_TIMEOUT_SHARE = 0.9;

export type ServiceName = 'identity-service' | 'company-service';

export interface ServiceCall<T> {
  service: ServiceName;
  method: 'GET' | 'POST';
  path: string;
  requestId: string;
  correlationId: string;
  body?: unknown;
  /** The caller's raw access token (x-user-token), for user-scoped endpoints. */
  userToken?: string | undefined;
  /** Validates the response body; omit for responses without a body (202/204). */
  schema?: z.ZodType<T>;
}

export interface ServiceClient {
  call<T = void>(call: ServiceCall<T>): Promise<T>;
}

const errorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ field: z.string(), message: z.string(), code: z.string().optional() })).default([]),
    retryable: z.boolean().default(false),
  }),
});

const ERROR_BY_STATUS: Record<number, new (message: string, options: AppErrorOptions) => AppError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: AuthorizationError,
  404: NotFoundError,
  409: ConflictError,
  422: BusinessRuleError,
  429: RateLimitError,
};

/** Rebuilds the downstream error (same code, message, details) so GraphQL reports exactly what the service decided. */
async function mapErrorResponse(res: Response): Promise<AppError> {
  const parsed = errorEnvelope.safeParse(await res.json().catch(() => undefined));
  const ErrorClass = ERROR_BY_STATUS[res.status];
  if (!parsed.success || !ErrorClass) return new DependencyError(undefined, { httpStatus: 502, cause: `status ${res.status}` });
  return new ErrorClass(parsed.data.error.message, parsed.data.error);
}

/** The one gateway-to-service client: service JWT, x-request-id, timeout, error-envelope mapping, zod-parsed responses. */
export function createServiceClient(deps: { config: GatewayConfig; tokens: TokenService | undefined }): ServiceClient {
  const { config, tokens } = deps;
  const baseUrl = { 'identity-service': config.IDENTITY_SERVICE_URL, 'company-service': config.COMPANY_SERVICE_URL };

  return {
    async call<T>({ service, method, path, requestId, correlationId, body, userToken, schema }: ServiceCall<T>): Promise<T> {
      if (!tokens) throw new DependencyError('This service is not available right now.');
      const serviceToken = await tokens.signServiceToken('api-gateway', service);
      let res: Response;
      try {
        res = await fetch(`${baseUrl[service]}${path}`, {
          method,
          headers: {
            authorization: `Bearer ${serviceToken}`,
            [HEADERS.requestId]: requestId,
            [HEADERS.correlationId]: correlationId,
            ...(userToken ? { [HEADERS.userToken]: userToken } : {}),
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          redirect: 'error',
          signal: AbortSignal.timeout(Math.floor(config.REQUEST_TIMEOUT_MS * DOWNSTREAM_TIMEOUT_SHARE)),
        });
      } catch (err) {
        const timedOut = err instanceof Error && err.name === 'TimeoutError';
        throw new DependencyError(undefined, { httpStatus: timedOut ? 504 : 503, cause: err });
      }
      if (!res.ok) throw await mapErrorResponse(res);
      if (!schema) return undefined as T;
      const parsed = schema.safeParse(await res.json().catch(() => undefined));
      if (!parsed.success) throw new DependencyError(undefined, { httpStatus: 502, cause: parsed.error });
      return parsed.data;
    },
  };
}
