import { describe, it, expect } from 'vitest';
import { resolvePaths } from '../src/resolver.js';
import type { CodeBlock } from '../src/types.js';

function makeBlock(precedingText: string, value: string, lang?: string, meta?: string, index = 0): CodeBlock {
  return { precedingText, value, lang, meta, index };
}

describe('resolvePaths', () => {
  it('resolves inline-code strategy', () => {
    const blocks = [makeBlock('See `src/a.ts`', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['inline-code']);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/a.ts');
  });

  it('resolves bold strategy', () => {
    const blocks = [makeBlock('**src/b.ts**', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['bold']);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/b.ts');
  });

  it('resolves backtick-heading strategy', () => {
    const blocks = [makeBlock('### `src/c.ts`', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['backtick-heading']);
    expect(files[0].path).toBe('src/c.ts');
  });

  it('resolves heading-bold strategy', () => {
    const blocks = [makeBlock('### **src/d.ts**', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['heading-bold']);
    expect(files[0].path).toBe('src/d.ts');
  });

  it('resolves file-bold strategy', () => {
    const blocks = [makeBlock('### File: **src/e.ts**', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['file-bold']);
    expect(files[0].path).toBe('src/e.ts');
  });

  it('resolves numbered-bold strategy', () => {
    const blocks = [makeBlock('1. **src/f.ts**', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['numbered-bold']);
    expect(files[0].path).toBe('src/f.ts');
  });

  it('resolves numbered-backtick strategy', () => {
    const blocks = [makeBlock('### 1. `src/g.ts`', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['numbered-backtick']);
    expect(files[0].path).toBe('src/g.ts');
  });

  it('resolves colon strategy', () => {
    const blocks = [makeBlock('src/h.ts:', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['colon']);
    expect(files[0].path).toBe('src/h.ts');
  });

  it('resolves hash strategy', () => {
    const blocks = [makeBlock('# src/i.ts', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['hash']);
    expect(files[0].path).toBe('src/i.ts');
  });

  it('resolves fence-meta strategy', () => {
    const blocks = [makeBlock('', 'export {};', 'ts', 'src/j.ts')];
    const files = resolvePaths(blocks, ['fence-meta']);
    expect(files[0].path).toBe('src/j.ts');
  });

  it('resolves xml-tag strategy', () => {
    const blocks = [makeBlock('<file name="src/k.ts">', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['xml-tag']);
    expect(files[0].path).toBe('src/k.ts');
  });

  it('resolves regex strategy', () => {
    const blocks = [makeBlock('foo src/l.ts bar', 'export {};', 'ts')];
    const files = resolvePaths(blocks, ['regex'], 'src/[a-z]+\\.ts');
    expect(files[0].path).toBe('src/l.ts');
  });

  it('resolves comment-path strategy for JS', () => {
    const blocks = [makeBlock('', '// src/m.ts\nexport {};', 'js')];
    const files = resolvePaths(blocks, ['comment-path']);
    expect(files[0].path).toBe('src/m.ts');
  });

  it('resolves comment-path strategy for Python', () => {
    const blocks = [makeBlock('', '# src/n.py\nx = 1', 'python')];
    const files = resolvePaths(blocks, ['comment-path']);
    expect(files[0].path).toBe('src/n.py');
  });

  it('resolves comment-path strategy for Vue', () => {
    const blocks = [makeBlock('', '<!-- src/App.vue -->\n<template>\n  <div>Hello</div>\n</template>', 'vue')];
    const files = resolvePaths(blocks, ['comment-path']);
    expect(files[0].path).toBe('src/App.vue');
  });

  it('resolves comment-path strategy for HTML', () => {
    const blocks = [makeBlock('', '<!-- index.html -->\n<!DOCTYPE html>', 'html')];
    const files = resolvePaths(blocks, ['comment-path']);
    expect(files[0].path).toBe('index.html');
  });

  it('skips blocks with no matching strategy', () => {
    const blocks = [makeBlock('no path here', 'content', 'ts')];
    const files = resolvePaths(blocks, ['bold']);
    expect(files).toHaveLength(0);
  });

  it('uses first strategy that matches when multiple are provided', () => {
    const blocks = [makeBlock('`src/p.ts` and **src/q.ts**', 'export {};', 'ts')];
    // inline-code comes before bold, so it wins.
    const files = resolvePaths(blocks, ['inline-code', 'bold']);
    expect(files[0].path).toBe('src/p.ts');
    // reverse order — bold wins.
    const files2 = resolvePaths(blocks, ['bold', 'inline-code']);
    expect(files2[0].path).toBe('src/q.ts');
  });
});
