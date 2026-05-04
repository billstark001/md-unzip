import * as esbuild from 'esbuild';
import { writeFileSync } from 'node:fs';

await esbuild.build({
  entryPoints: ['./src/cli.ts', './src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: 'dist',
  external: [],
  banner: {
    js: `#!/usr/bin/env node\n`,
  },
  minify: true,
  splitting: false,
});

writeFileSync(
  'bin/md-unzip.js',
  '#!/usr/bin/env node\nimport "../dist/cli.js";\n',
  'utf-8',
);

console.log('Build complete: dist/cli.js, dist/index.js, bin/md-unzip.js');
