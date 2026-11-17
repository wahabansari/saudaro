import type { AppError, FieldError } from './errors.ts';

export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: FieldError[];
    retryable: boolean;
    requestId: string;
    timestamp: string;
    /** Only present when explicitly enabled (development). */
    stack?: string;
  };
}

/** The platform-wide REST error envelope. Never includes `cause`, SQL, or internals. */
export function toErrorBody(
  err: AppError,
  ctx: { requestId: string; includeStack?: boolean; now?: Date },
): ErrorBody {
  return {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
      retryable: err.retryable,
      requestId: ctx.requestId,
      timestamp: (ctx.now ?? new Date()).toISOString(),
      ...(ctx.includeStack && err.stack ? { stack: err.stack } : {}),
    },
  };
}
