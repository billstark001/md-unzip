import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFiles } from '../src/writer.js';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExtractedFile } from '../src/types.js';

describe('writeFiles', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'md-unzip-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true });
  });

  it('writes files to nested directories', () => {
    const files: ExtractedFile[] = [
      { path: 'src/index.ts', content: 'export {};', lang: 'ts' },
      { path: 'README.md', content: '# Hello', lang: 'md' },
    ];
    const result = writeFiles(files, dir, false);
    expect(result.written).toBe(2);
    expect(result.skipped).toBe(0);
    expect(readFileSync(join(dir, 'src/index.ts'), 'utf-8')).toBe('export {};');
    expect(readFileSync(join(dir, 'README.md'), 'utf-8')).toBe('# Hello');
  });

  it('does not write anything in dry-run mode', () => {
    const files: ExtractedFile[] = [{ path: 'x.ts', content: 'x', lang: 'ts' }];
    const result = writeFiles(files, dir, true);
    expect(result.written).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.details[0]).toContain('dry-run');
    expect(readdirSync(dir)).toEqual([]);
  });

  it('skips directory-traversal attempts', () => {
    const files: ExtractedFile[] = [{ path: '../escape.ts', content: 'bad', lang: 'ts' }];
    const result = writeFiles(files, dir, false);
    expect(result.skipped).toBe(1);
    expect(result.written).toBe(0);
  });

  it('skips empty or directory-like paths', () => {
    const files: ExtractedFile[] = [
      { path: '', content: 'bad', lang: 'ts' },
      { path: 'nested/', content: 'bad', lang: 'ts' },
    ];
    const result = writeFiles(files, dir, false);
    expect(result.skipped).toBe(2);
    expect(result.written).toBe(0);
    expect(readdirSync(dir)).toEqual([]);
  });
});
