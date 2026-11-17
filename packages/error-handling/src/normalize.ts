import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  BusinessRuleError,
  ConflictError,
  DependencyError,
  InternalServerError,
  ValidationError,
  type FieldError,
} from './errors.ts';

interface ZodLikeIssue {
  path?: (string | number)[];
  message?: string;
  code?: string;
}

const NETWORK_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN']);

/**
 * Converts ANY thrown value into an AppError. PostgreSQL SQLSTATEs, Zod issues, body-parser errors and
 * network failures are mapped to safe, stable errors; the original is kept as `cause` for server-side logs.
 * Driver messages (table/column/value names) are never copied into the client-facing message.
 */
export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const e = err as { name?: string; code?: string; type?: string; issues?: ZodLikeIssue[]; cause?: unknown };

  if (e?.name === 'ZodError' && Array.isArray(e.issues)) {
    const details: FieldError[] = e.issues.map((i) => ({
      field: (i.path ?? []).join('.') || '(root)',
      message: i.message ?? 'Invalid value',
      ...(i.code ? { code: i.code } : {}),
    }));
    return new ValidationError('Some fields are invalid.', { details, cause: err });
  }

  if (e?.type === 'entity.too.large') {
    return new ValidationError('The request body is too large.', {
      code: 'PAYLOAD_TOO_LARGE',
      httpStatus: 413,
      cause: err,
    });
  }
  if (e?.type === 'entity.parse.failed') {
    return new ValidationError('The request body is not valid JSON.', { code: 'MALFORMED_JSON', cause: err });
  }

  const pgCode = (e?.cause as { code?: string } | undefined)?.code ?? e?.code;
  switch (pgCode) {
    case '28000':
    case '28P01':
      return new AuthenticationError('Authentication is required.', { cause: err });
    case '42501':
      return new AuthorizationError('You are not allowed to perform this action.', { cause: err });
    case '23505':
      return new ConflictError('The resource already exists or conflicts with its current state.', {
        cause: err,
      });
    case '23503':
      return new ConflictError('A referenced resource does not exist or is not accessible.', {
        code: 'INVALID_REFERENCE',
        cause: err,
      });
    case '23514':
    case '23502':
    case '22P02':
    case '22003':
    case '22001':
      return new BusinessRuleError('The submitted data violates a business rule.', {
        code: 'INVALID_DATA',
        cause: err,
      });
    case '40001':
    case '40P01':
      return new ConflictError('A concurrent update was detected. Please retry.', {
        code: 'CONCURRENT_MODIFICATION',
        retryable: true,
        cause: err,
      });
    case '55P03':
    case '57014':
    case '53300':
      return new DependencyError('The service is busy. Please try again shortly.', { cause: err });
    default:
      break;
  }

  if (typeof pgCode === 'string' && NETWORK_CODES.has(pgCode)) {
    return new DependencyError(undefined, { cause: err });
  }
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') {
    return new DependencyError('The request timed out. Please try again.', { httpStatus: 504, cause: err });
  }
  return new InternalServerError({ cause: err });
}
