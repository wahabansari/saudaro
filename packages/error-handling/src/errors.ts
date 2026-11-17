/**
 * One error model for the whole platform. Every failure that reaches a client is an AppError with a
 * STABLE machine-readable `code`, a safe user-facing `message`, optional field-level `details`, and a
 * `retryable` classification. Internal diagnostics live in `cause` and are only ever logged server-side.
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface AppErrorOptions {
  /** Overrides the class default (e.g. COMPANY_ACCESS_DENIED). Must stay stable once published. */
  code?: string;
  details?: FieldError[];
  /** Server-side only: never serialised to clients. */
  cause?: unknown;
  retryable?: boolean;
  retryAfterSeconds?: number;
}

export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details: FieldError[];
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    defaultCode: string,
    httpStatus: number,
    message: string,
    options: AppErrorOptions = {},
    defaultRetryable = false,
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code ?? defaultCode;
    this.httpStatus = httpStatus;
    this.details = options.details ?? [];
    this.retryable = options.retryable ?? defaultRetryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/** 400 — the request is malformed or violates input rules. Not retryable without changing the input. */
export class ValidationError extends AppError {
  constructor(
    message = 'The request contains invalid data.',
    options: AppErrorOptions & { httpStatus?: number } = {},
  ) {
    super('VALIDATION_ERROR', options.httpStatus ?? 400, message, options);
  }
}

/** 401 — missing, expired or invalid credentials. */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication is required.', options: AppErrorOptions = {}) {
    super('AUTHENTICATION_ERROR', 401, message, options);
  }
}

/** 403 — authenticated but not allowed. */
export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action.', options: AppErrorOptions = {}) {
    super('AUTHORIZATION_ERROR', 403, message, options);
  }
}

/** 404 — also used when existence must not be revealed to unauthorised callers. */
export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.', options: AppErrorOptions = {}) {
    super('NOT_FOUND', 404, message, options);
  }
}

/** 409 — state conflict (duplicate, concurrent modification). */
export class ConflictError extends AppError {
  constructor(
    message = 'The request conflicts with the current state of the resource.',
    options: AppErrorOptions = {},
  ) {
    super('CONFLICT', 409, message, options);
  }
}

/** 422 — well-formed request that breaks a business rule (e.g. RFQ already closed). */
export class BusinessRuleError extends AppError {
  constructor(message = 'The action is not allowed in the current state.', options: AppErrorOptions = {}) {
    super('BUSINESS_RULE_VIOLATION', 422, message, options);
  }
}

/** 429 — retryable after `retryAfterSeconds`. */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.', options: AppErrorOptions = {}) {
    super('RATE_LIMITED', 429, message, options, true);
  }
}

/** 502/503/504 — a dependency (database, broker, another service) failed. Retryable by default. */
export class DependencyError extends AppError {
  constructor(
    message = 'A required service is temporarily unavailable. Please try again.',
    options: AppErrorOptions & { httpStatus?: 502 | 503 | 504 } = {},
  ) {
    super('DEPENDENCY_ERROR', options.httpStatus ?? 503, message, options, true);
  }
}

/** 500 — everything unexpected. The message is always generic. */
export class InternalServerError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super(
      'INTERNAL_ERROR',
      500,
      'An unexpected error occurred. Please try again or contact support with the request id.',
      options,
    );
  }
}
