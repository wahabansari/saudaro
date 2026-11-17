import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { AppError } from './errors.ts';
import { normalizeError } from './normalize.ts';

/** Codes GraphQL itself raises for syntax/validation problems: safe to show, mapped to our stable codes. */
const GRAPHQL_CODE_MAP: Record<string, { code: string; status: number }> = {
  GRAPHQL_PARSE_FAILED: { code: 'VALIDATION_ERROR', status: 400 },
  GRAPHQL_VALIDATION_FAILED: { code: 'VALIDATION_ERROR', status: 400 },
  BAD_USER_INPUT: { code: 'VALIDATION_ERROR', status: 400 },
  BAD_REQUEST: { code: 'VALIDATION_ERROR', status: 400 },
  PERSISTED_QUERY_NOT_FOUND: { code: 'PERSISTED_QUERY_NOT_FOUND', status: 400 },
  PERSISTED_QUERY_NOT_SUPPORTED: { code: 'PERSISTED_QUERY_REQUIRED', status: 400 },
};

/** Throwable inside resolvers: carries the same stable extensions as every other error. */
export function toGraphQLError(err: unknown, requestId?: string): GraphQLError {
  const app = normalizeError(err);
  return new GraphQLError(app.message, {
    extensions: {
      code: app.code,
      retryable: app.retryable,
      details: app.details,
      http: { status: app.httpStatus },
      ...(requestId ? { requestId } : {}),
    },
    originalError: err instanceof Error ? err : undefined,
  });
}

/**
 * Apollo `formatError`: ONE structure for every GraphQL error — stable `extensions.code`, `requestId`,
 * `retryable`, field `details`; stack traces only when `exposeStack` (development). Unknown errors are
 * replaced by a generic message so SQL/driver text can never reach a client.
 */
export function formatGraphQLError(
  formatted: GraphQLFormattedError,
  original: unknown,
  ctx: { requestId: string; exposeStack?: boolean },
): GraphQLFormattedError {
  const ext = (formatted.extensions ?? {}) as Record<string, unknown>;
  const mapped = typeof ext.code === 'string' ? GRAPHQL_CODE_MAP[ext.code] : undefined;
  const unwrapped = (original as { originalError?: unknown } | undefined)?.originalError ?? original;

  let code: string;
  let message = formatted.message;
  let details: unknown = ext.details ?? [];
  let retryable = false;
  let status = 200;

  if (unwrapped instanceof AppError) {
    ({ code, message, retryable } = unwrapped);
    details = unwrapped.details;
    status = unwrapped.httpStatus;
  } else if (mapped) {
    code = mapped.code;
    status = mapped.status;
  } else if (typeof ext.code === 'string' && ext.code !== 'INTERNAL_SERVER_ERROR') {
    code = ext.code;
  } else {
    const app = normalizeError(unwrapped);
    ({ code, message, retryable } = app);
    details = app.details;
    status = app.httpStatus;
  }

  return {
    message,
    ...(formatted.locations ? { locations: formatted.locations } : {}),
    ...(formatted.path ? { path: formatted.path } : {}),
    extensions: {
      code,
      requestId: ctx.requestId,
      retryable,
      details,
      http: { status },
      ...(ctx.exposeStack && (unwrapped as Error)?.stack ? { stacktrace: (unwrapped as Error).stack } : {}),
    },
  };
}
