import type { CodeBlock, PathStrategy, Strategy, ExtractedFile } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────

const URL_RE = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;
const FILE_NAME_RE = /^(?:\.[A-Za-z0-9._-]+|[A-Za-z0-9_-]+(?:\.[A-Za-z0-9._-]+)+)$/;

/**
 * Map of language identifiers → single-line comment regex.
 * Covers all common languages that LLMs emit in markdown code fences.
 */
const COMMENT_RE_MAP: Record<string, RegExp> = {
  // C-style
  js: /\/\/\s*(.+)/,
  javascript: /\/\/\s*(.+)/,
  ts: /\/\/\s*(.+)/,
  typescript: /\/\/\s*(.+)/,
  jsx: /\/\/\s*(.+)/,
  tsx: /\/\/\s*(.+)/,
  c: /\/\/\s*(.+)/,
  cpp: /\/\/\s*(.+)/,
  'c++': /\/\/\s*(.+)/,
  csharp: /\/\/\s*(.+)/,
  cs: /\/\/\s*(.+)/,
  java: /\/\/\s*(.+)/,
  scala: /\/\/\s*(.+)/,
  kotlin: /\/\/\s*(.+)/,
  kt: /\/\/\s*(.+)/,
  swift: /\/\/\s*(.+)/,
  go: /\/\/\s*(.+)/,
  rust: /\/\/\s*(.+)/,
  rs: /\/\/\s*(.+)/,
  php: /\/\/\s*(.+)/,
  dart: /\/\/\s*(.+)/,
  // Shell / Config
  sh: /#\s*(.+)/,
  bash: /#\s*(.+)/,
  shell: /#\s*(.+)/,
  zsh: /#\s*(.+)/,
  fish: /#\s*(.+)/,
  python: /#\s*(.+)/,
  py: /#\s*(.+)/,
  r: /#\s*(.+)/,
  ruby: /#\s*(.+)/,
  rb: /#\s*(.+)/,
  perl: /#\s*(.+)/,
  pl: /#\s*(.+)/,
  yaml: /#\s*(.+)/,
  yml: /#\s*(.+)/,
  toml: /#\s*(.+)/,
  ini: /[#;]\s*(.+)/,
  conf: /#\s*(.+)/,
  nginx: /#\s*(.+)/,
  dockerfile: /#\s*(.+)/,
  makefile: /#\s*(.+)/,
  cmake: /#\s*(.+)/,
  // Web
  html: /<!--\s*(.+?)\s*-->/,
  xml: /<!--\s*(.+?)\s*-->/,
  svg: /<!--\s*(.+?)\s*-->/,
  css: /\/\*\s*(.+?)\s*\*\//,
  scss: /\/\/\s*(.+)/,
  sass: /\/\/\s*(.+)/,
  less: /\/\/\s*(.+)/,
  // SQL / DB
  sql: /--\s*(.+)/,
  mysql: /--\s*(.+)/,
  postgresql: /--\s*(.+)/,
  sqlite: /--\s*(.+)/,
  // Data
  json: /\/\/\s*(.+)/,
  json5: /\/\/\s*(.+)/,
  // Functional
  lisp: /;\s*(.+)/,
  clojure: /;\s*(.+)/,
  scheme: /;\s*(.+)/,
  racket: /;\s*(.+)/,
  erlang: /%\s*(.+)/,
  elixir: /#\s*(.+)/,
  haskell: /--\s*(.+)/,
  lhs: /%\s*(.+)/,
  // Other
  matlab: /%\s*(.+)/,
  octave: /#\s*(.+)/,
  fortran: /!\s*(.+)/,
  julia: /#\s*(.+)/,
  lua: /--\s*(.+)/,
  vim: /"\s*(.+)/,
  awk: /#\s*(.+)/,
  sed: /#\s*(.+)/,
  graphql: /#\s*(.+)/,
  prisma: /\/\/\s*(.+)/,
  protobuf: /\/\/\s*(.+)/,
  thrift: /\/\/\s*(.+)/,
};

// ─── Strategy Builders ─────────────────────────────────────────────────────

const headingRe = /^#{1,6}\s+(.+)$/m;
const backtickHeadingRe = /^#{1,6}\s+`([^`]+)`/m;
const boldRe = /\*\*([^*\n]+)\*\*/;
const fileBoldRe = /(?:File:\s*)?\*\*([^*\n]+)\*\*/;
const headingBoldRe = /^#{1,6}\s+\*\*([^*\n]+)\*\*/m;
const numberedBoldRe = /^(?:#{1,6}\s+)?\d+\.\s+\*\*([^*\n]+)\*\*/m;
const numberedBacktickRe = /^(?:#{1,6}\s+)?\d+\.\s+`([^`]+)`/m;
const colonRe = /^(.+):\s*$/m;
const hashRe = /^#\s+(.+)$/m;
const xmlTagRe = /<file[^>]*\bname=["']([^"']+)["'][^>]*>/;

function buildStrategies(regex?: RegExp): Strategy[] {
  const strategies: Strategy[] = [
    // 1. fence-meta: ```ts path/to/file.ts
    {
      name: 'fence-meta',
      resolve(block) {
        if (!block.meta) return undefined;
        return extractPath(block.meta);
      },
    },
    // 2. xml-tag: <file name="path/to/file.ts">
    {
      name: 'xml-tag',
      resolve(block) {
        const m = block.precedingText.match(xmlTagRe);
        return m ? m[1] : undefined;
      },
    },
    // 3. heading: ### path/to/file.ts
    {
      name: 'heading',
      resolve(block) {
        const m = block.precedingText.match(headingRe);
        return m ? extractPath(m[1]) : undefined;
      },
    },
    // 4. backtick-heading: ### `path/to/file.ts`
    {
      name: 'backtick-heading',
      resolve(block) {
        const m = block.precedingText.match(backtickHeadingRe);
        return m ? m[1] : undefined;
      },
    },
    // 5. heading-bold: ### **path/to/file.ts**
    {
      name: 'heading-bold',
      resolve(block) {
        const m = block.precedingText.match(headingBoldRe);
        return m ? extractPath(m[1]) : undefined;
      },
    },
    // 6. file-bold: ### File: **path/to/file.ts**
    {
      name: 'file-bold',
      resolve(block) {
        const m = block.precedingText.match(fileBoldRe);
        return m ? extractPath(m[1]) : undefined;
      },
    },
    // 7. bold: **path/to/file.ts**
    {
      name: 'bold',
      resolve(block) {
        const m = block.precedingText.match(boldRe);
        return m ? extractPath(m[1]) : undefined;
      },
    },
    // 8. numbered-bold: 1. **path/to/file.ts**
    {
      name: 'numbered-bold',
      resolve(block) {
        const m = block.precedingText.match(numberedBoldRe);
        return m ? extractPath(m[1]) : undefined;
      },
    },
    // 9. numbered-backtick: ### 1. `path/to/file.ts`
    {
      name: 'numbered-backtick',
      resolve(block) {
        const m = block.precedingText.match(numberedBacktickRe);
        return m ? m[1] : undefined;
      },
    },
    // 10. colon: path/to/file.ts:
    {
      name: 'colon',
      resolve(block) {
        const m = block.precedingText.match(colonRe);
        return m ? extractPath(m[1]) : undefined;
      },
    },
    // 11. hash: # path/to/file.ts
    {
      name: 'hash',
      resolve(block) {
        const m = block.precedingText.match(hashRe);
        return m ? extractPath(m[1]) : undefined;
      },
    },
    // 12. inline-code: `path/to/file.ts`
    {
      name: 'inline-code',
      resolve(block) {
        const m = block.precedingText.match(/`([^`\n]+)`/);
        return m ? m[1].trim() : undefined;
      },
    },
    // 13. path-string: first POSIX-looking path
    {
      name: 'path-string',
      resolve(block) {
        return extractPath(block.precedingText);
      },
    },
    // 14. regex: user-supplied pattern
    {
      name: 'regex',
      resolve(block, ctx) {
        if (!ctx?.regex) return undefined;
        const m = ctx.regex.exec(block.precedingText);
        return m ? m[0].trim() : undefined;
      },
    },
    // 15. comment-path: first-line comment
    {
      name: 'comment-path',
      resolve(block) {
        return findCommentPath(block);
      },
    },
  ];

  return strategies;
}

// ─── Resolver ──────────────────────────────────────────────────────────────

/**
 * Resolve file paths for each code block using the requested strategies.
 *
 * Strategies are tried in the order given.  The first successful match wins.
 */
export function resolvePaths(
  blocks: CodeBlock[],
  strategyNames: PathStrategy[],
  regex?: string
): ExtractedFile[] {
  const compiledRe = regex ? new RegExp(regex, 'm') : undefined;
  const allStrategies = buildStrategies(compiledRe);

  // Order strategies according to user preference, defaulting to declaration order.
  const ordered = strategyNames
    .map((name) => allStrategies.find((s) => s.name === name))
    .filter(Boolean) as Strategy[];

  const files: ExtractedFile[] = [];

  for (const block of blocks) {
    let path: string | undefined;

    for (const strat of ordered) {
      path = strat.resolve(block, { regex: compiledRe });
      if (path) break;
    }

    if (!path) continue;
    files.push({
      path: normalizePath(path),
      content: block.value,
      lang: block.lang,
    });
  }

  return files;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Attempt to find a path inside a code-block comment line.
 */
function findCommentPath(block: CodeBlock): string | undefined {
  const lines = block.value.split('\n');
  if (!lines.length) return undefined;
  const first = lines[0];

  const lang = (block.lang || '').toLowerCase();
  const commentRe = COMMENT_RE_MAP[lang] || /#\s*(.+)/;
  const m = first.match(commentRe);
  if (!m) return undefined;

  const content = m[1];
  return extractPath(content);
}

/**
 * Extract a path from a string that may contain extra words (e.g. heading text).
 */
function extractPath(text: string): string | undefined {
  for (const rawToken of text.match(/[^\s<>"|?*\n]+/g) ?? []) {
    const token = sanitizePathToken(rawToken);
    if (looksLikePath(token)) {
      return token;
    }
  }

  const trimmed = sanitizePathToken(text.trim());
  return looksLikePath(trimmed) ? trimmed : undefined;
}

/**
 * Normalize back-slashes to forward slashes and collapse relative prefixes.
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^(?:\.\/)+/, './');
}

function sanitizePathToken(token: string): string {
  return token
    .trim()
    .replace(/^[`"'([{*]+/, '')
    .replace(/[>`"')\]}*,:;.!?]+$/, '');
}

function looksLikePath(token: string): boolean {
  if (!token || token === '.' || token === '..') return false;
  if (URL_RE.test(token)) return false;
  if (/^[A-Za-z]:[\\/]/.test(token)) return true;
  if (/^[\\/]/.test(token)) return true;
  if (token.includes('/') || token.includes('\\')) return true;
  return FILE_NAME_RE.test(token);
}
