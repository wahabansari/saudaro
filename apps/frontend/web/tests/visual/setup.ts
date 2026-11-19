import fs from 'node:fs';
import path from 'node:path';
import { OUT } from './helpers';

/** Start from a clean slate so stale results cannot mask a failure. */
export default function globalSetup() {
  fs.rmSync(path.join(OUT, 'diff'), { recursive: true, force: true });
  for (const f of ['pixel-1440.json', 'pixel-375.json', 'a11y.json', 'keyboard.json']) fs.rmSync(path.join(OUT, f), { force: true });
}
