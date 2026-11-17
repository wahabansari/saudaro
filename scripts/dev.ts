import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { DB_SERVICES, GATEWAY, ROOT, roleUrl } from './services.ts';

/**
 * Starts the gateway and every implemented service with tsx (watch mode is available per workspace via
 * `npm run dev -w <package>`). Output is prefixed per process. Ctrl+C stops everything gracefully.
 */
const children: ChildProcess[] = [];
function launch(name: string, dir: string, entry: string, env: Record<string, string>): void {
  const child = spawn(
    process.execPath,
    [`--env-file-if-exists=${join(ROOT, '.env')}`, '--import', 'tsx', join(ROOT, dir, entry)],
    {
      cwd: join(ROOT, dir),
      env: { ...process.env, NODE_ENV: 'development', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const prefix = (stream: NodeJS.ReadableStream, out: NodeJS.WriteStream) =>
    stream.on('data', (chunk: Buffer) => {
      for (const line of String(chunk).split('\n').filter(Boolean)) out.write(`[${name}] ${line}\n`);
    });
  prefix(child.stdout!, process.stdout);
  prefix(child.stderr!, process.stderr);
  child.on('exit', (code) => console.log(`[${name}] exited with code ${code}`));
  children.push(child);
}

launch(GATEWAY.name, GATEWAY.dir, GATEWAY.entry, { PORT: String(GATEWAY.port) });
for (const s of DB_SERVICES) {
  launch(`${s.name}-service`, s.dir, 'src/main.ts', {
    PORT: String(s.port),
    DATABASE_URL: roleUrl(s, 'app'),
    COMPANY_SERVICE_URL: 'http://127.0.0.1:4002',
  });
}

const stop = () => {
  for (const c of children) c.kill('SIGTERM');
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
