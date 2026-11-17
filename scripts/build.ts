import { rmSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { build, type Plugin } from 'esbuild';
import { DB_SERVICES, GATEWAY, ROOT } from './services.ts';

/**
 * Bundles each deployable into dist/<name>/main.mjs.
 *  - Workspace packages (@saudaro/*, TypeScript source) are BUNDLED in.
 *  - Every third-party package stays EXTERNAL (installed in the image): this keeps exactly one copy of
 *    `graphql` etc. (no dual-package hazard) and keeps the bundle small.
 */
const bundleWorkspaceOnly: Plugin = {
  name: 'external-third-party',
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.kind === 'entry-point' || isAbsolute(args.path)) return undefined;
      if (args.path.startsWith('@saudaro/') || args.path.startsWith('node:')) return undefined;
      return { path: args.path, external: true };
    });
  },
};

const targets = [
  { name: GATEWAY.name, dir: GATEWAY.dir, entry: GATEWAY.entry },
  ...DB_SERVICES.map((s) => ({ name: `${s.name}-service`, dir: s.dir, entry: 'src/main.ts' })),
];
const only = process.argv[2];

for (const t of targets.filter((x) => !only || x.name === only)) {
  const outdir = join(ROOT, 'dist', t.name);
  rmSync(outdir, { recursive: true, force: true });
  await build({
    entryPoints: [join(ROOT, t.dir, t.entry)],
    outfile: join(outdir, 'main.mjs'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    sourcemap: true,
    plugins: [bundleWorkspaceOnly],
    logLevel: 'warning',
  });
  console.log(`built dist/${t.name}/main.mjs`);
}
