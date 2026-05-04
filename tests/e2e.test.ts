import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extract } from '../src/index.js';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('extract (e2e)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'md-unzip-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true });
  });

  it('end-to-end extraction from realistic LLM output', () => {
    const markdown = `
# Project Setup

## Entry Point

### \`src/main.ts\`

\`\`\`typescript
// src/main.ts
import { app } from './app';
app.start();
\`\`\`

## Styles

**src/styles.css**

\`\`\`css
/* src/styles.css */
body { margin: 0; }
\`\`\`

## Config

\`\`\`yaml config/app.yaml
port: 3000
\`\`\`
`;
    const inputFile = join(dir, 'input.md');
    writeFileSync(inputFile, markdown, 'utf-8');

    const outDir = join(dir, 'out');
    const { files, result } = extract({
      inputFile,
      outputDir: outDir,
      strategies: ['backtick-heading', 'bold', 'fence-meta', 'comment-path'],
      dryRun: false,
    });

    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(result.written).toBeGreaterThanOrEqual(2);
    expect(existsSync(join(outDir, 'src', 'main.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src', 'styles.css'))).toBe(true);
    expect(existsSync(join(outDir, 'config', 'app.yaml'))).toBe(true);
  });

  it('dry-run produces no files', () => {
    const markdown = '**a.ts**\n\n\`\`\`ts\nexport {};\n\`\`\`\n';
    const inputFile = join(dir, 'input.md');
    writeFileSync(inputFile, markdown, 'utf-8');

    const outDir = join(dir, 'out');
    const { result } = extract({
      inputFile,
      outputDir: outDir,
      strategies: ['bold'],
      dryRun: true,
    });

    expect(result.written).toBe(0);
    expect(existsSync(join(outDir, 'a.ts'))).toBe(false);
  });
});
