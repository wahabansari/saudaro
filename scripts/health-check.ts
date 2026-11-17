import { DB_SERVICES, GATEWAY } from './services.ts';

/** Calls /health/ready of every locally running component and prints the result. Exit code 1 if any is down. */
const targets = [GATEWAY, ...DB_SERVICES.map((s) => ({ name: `${s.name}-service`, port: s.port }))];
let down = 0;
for (const t of targets) {
  const url = `http://127.0.0.1:${t.port}/health/ready`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const body = (await res.json()) as { status?: string };
    console.log(
      `${res.ok ? 'UP  ' : 'DOWN'} ${t.name.padEnd(18)} ${url} → ${res.status} ${body.status ?? ''}`,
    );
    if (!res.ok) down += 1;
  } catch (err) {
    console.log(`DOWN ${t.name.padEnd(18)} ${url} → ${(err as Error).message}`);
    down += 1;
  }
}
process.exit(down ? 1 : 0);
