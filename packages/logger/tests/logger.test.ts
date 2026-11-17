import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, safeError } from '../src/index.ts';

function capture(): { lines: () => Record<string, unknown>[]; stream: Writable } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(String(chunk));
      cb();
    },
  });
  return {
    stream,
    lines: () =>
      chunks
        .join('')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l)),
  };
}

describe('logger', () => {
  it('writes JSON with service name and ISO time', () => {
    const c = capture();
    createLogger({ service: 'identity-service' }, c.stream).info({ requestId: 'r1' }, 'hello');
    const [line] = c.lines();
    expect(line).toMatchObject({ service: 'identity-service', level: 'info', msg: 'hello', requestId: 'r1' });
    expect(String(line?.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('redacts credentials, tokens and auth headers', () => {
    const c = capture();
    createLogger({ service: 's' }, c.stream).info(
      {
        req: { headers: { authorization: 'Bearer abc', cookie: 'sid=1' } },
        user: { password: 'p', refreshToken: 'r' },
        token: 't',
      },
      'x',
    );
    const text = JSON.stringify(c.lines());
    for (const secret of ['Bearer abc', 'sid=1', '"p"', '"r"', '"t"']) expect(text).not.toContain(secret);
    expect(text).toContain('[redacted]');
  });

  it('safeError drops driver detail fields', () => {
    const err = Object.assign(new Error('duplicate key'), {
      code: '23505',
      detail: 'Key (email)=(a@b.c) already exists.',
    });
    const out = JSON.stringify(safeError(err));
    expect(out).toContain('23505');
    expect(out).not.toContain('a@b.c');
  });
});
