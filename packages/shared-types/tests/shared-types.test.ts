import { describe, expect, it } from 'vitest';
import { buildConnection, clampPageSize, decodeCursor, encodeCursor } from '../src/index.ts';

describe('cursor encoding', () => {
  it('round-trips', () => {
    const c = encodeCursor({ t: '2026-11-17T10:00:00Z', id: 'abc' });
    expect(decodeCursor(c)).toEqual({ t: '2026-11-17T10:00:00Z', id: 'abc' });
  });
  it.each([
    '',
    '%%%',
    Buffer.from('[1,2]').toString('base64url'),
    Buffer.from('{"a":{"b":1}}').toString('base64url'),
    'x'.repeat(600),
  ])('rejects malformed cursor %#', (bad) => expect(decodeCursor(bad)).toBeNull());
});

describe('pagination', () => {
  it('clamps page size', () => {
    expect(clampPageSize(undefined)).toBe(20);
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(10_000)).toBe(100);
    expect(clampPageSize(Number.NaN)).toBe(20);
  });
  it('buildConnection uses the extra row only to signal hasNextPage', () => {
    const rows = [1, 2, 3, 4];
    const page = buildConnection(rows, 3, (n) => `c${n}`);
    expect(page.edges.map((e) => e.node)).toEqual([1, 2, 3]);
    expect(page.pageInfo).toEqual({ hasNextPage: true, endCursor: 'c3' });
    expect(buildConnection([1, 2], 3, (n) => `c${n}`).pageInfo.hasNextPage).toBe(false);
    expect(buildConnection([], 3, String).pageInfo).toEqual({ hasNextPage: false, endCursor: null });
  });
});
