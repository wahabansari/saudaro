export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface PgLikeError {
  code?: string;
}

/**
 * Maps PostgreSQL SQLSTATEs to safe HTTP errors. Database messages (which can name tables,
 * columns or values) are NEVER returned to clients; they are logged server-side only.
 */
export function mapDatabaseError(err: unknown): AppError | null {
  const cause = (err as { cause?: unknown })?.cause ?? err;
  const code = (cause as PgLikeError)?.code;
  switch (code) {
    case '28000':
      return new AppError(401, 'unauthenticated', 'Authentication required');
    case '42501':
      return new AppError(403, 'forbidden', 'You are not allowed to perform this action');
    case '23505':
      return new AppError(409, 'conflict', 'The resource already exists or conflicts with current state');
    case '23503':
      return new AppError(409, 'invalid_reference', 'A referenced resource does not exist or is not accessible');
    case '23514':
    case '22P02':
    case '22003':
      return new AppError(422, 'invalid_data', 'The submitted data violates a business rule');
    case '40001':
    case '40P01':
      return new AppError(409, 'retry', 'Concurrent update detected; please retry');
    case '55P03':
    case '57014':
      return new AppError(503, 'busy', 'The service is busy; please retry');
    default:
      return null;
  }
}
