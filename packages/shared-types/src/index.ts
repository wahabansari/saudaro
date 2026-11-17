/** Nominal ("branded") ids: a CompanyId cannot be passed where a UserId is expected. */
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type UserId = Brand<string, 'UserId'>;
export type CompanyId = Brand<string, 'CompanyId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type RequestId = Brand<string, 'RequestId'>;

export const asUserId = (s: string): UserId => s as UserId;
export const asCompanyId = (s: string): CompanyId => s as CompanyId;
export const asSessionId = (s: string): SessionId => s as SessionId;

// ---- Relay-style cursor pagination ---------------------------------------------------------------------
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}
export interface Edge<T> {
  cursor: string;
  node: T;
}
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(
  first: number | undefined,
  max = MAX_PAGE_SIZE,
  fallback = DEFAULT_PAGE_SIZE,
): number {
  if (first === undefined || !Number.isFinite(first)) return fallback;
  return Math.min(Math.max(Math.trunc(first), 1), max);
}

/** Opaque keyset cursor: base64url(JSON). Treat as untrusted input; always validate after decoding. */
export function encodeCursor(payload: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/** Returns null for anything that is not a well-formed cursor (caller decides the error). */
export function decodeCursor(cursor: string): Record<string, string | number> | null {
  if (cursor.length > 512) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    for (const v of Object.values(parsed)) if (typeof v !== 'string' && typeof v !== 'number') return null;
    return parsed as Record<string, string | number>;
  } catch {
    return null;
  }
}

/**
 * Build a connection from rows fetched with `LIMIT first + 1`: the extra row only signals `hasNextPage`
 * and is never returned, so no page ever loads more than `first + 1` rows.
 */
export function buildConnection<T>(rows: T[], first: number, cursorOf: (row: T) => string): Connection<T> {
  const page = rows.slice(0, first);
  const edges = page.map((node) => ({ cursor: cursorOf(node), node }));
  return {
    edges,
    pageInfo: {
      hasNextPage: rows.length > first,
      endCursor: edges.length ? (edges[edges.length - 1]?.cursor ?? null) : null,
    },
  };
}
