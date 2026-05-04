import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/parse.js';

// Helper to create temp markdown files without touching disk in unit tests.
// For parseMarkdown we need real files, so we use memfs in future; for now we
// write temp fixtures and clean up.
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('parseMarkdown', () => {
  it('returns empty array for document without code blocks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'md-unzip-'));
    const file = join(dir, 'test.md');
    writeFileSync(file, '# Hello\n\nNo code here.\n', 'utf-8');
    const blocks = parseMarkdown(file);
    expect(blocks).toHaveLength(0);
    rmSync(dir, { recursive: true });
  });

  it('extracts fenced code blocks with preceding text', () => {
    const dir = mkdtempSync(join(tmpdir(), 'md-unzip-'));
    const file = join(dir, 'test.md');
    writeFileSync(
      file,
      'Some intro.\n\n`src/index.ts`\n```typescript\n// src/index.ts\nexport const x = 1;\n```\n\nNext paragraph.\n\n**styles.css**\n```css\n/* styles.css */\nbody {}\n```\n',
      'utf-8',
    );
    const blocks = parseMarkdown(file);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].lang).toBe('typescript');
    expect(blocks[0].precedingText).toContain('`src/index.ts`');
    expect(blocks[1].lang).toBe('css');
    expect(blocks[1].precedingText).toContain('styles.css');
    rmSync(dir, { recursive: true });
  });

  it('collects multi-line preceding text across paragraphs and headings', () => {
    const dir = mkdtempSync(join(tmpdir(), 'md-unzip-'));
    const file = join(dir, 'test.md');
    writeFileSync(
      file,
      '### Heading\n\nParagraph with `inline`.\n\n```js\nconst a = 1;\n```\n',
      'utf-8',
    );
    const blocks = parseMarkdown(file);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].precedingText).toContain('Heading');
    expect(blocks[0].precedingText).toContain('inline');
    rmSync(dir, { recursive: true });
  });
});
