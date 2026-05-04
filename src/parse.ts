import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { CodeBlock } from './types.js';

/**
 * Parse a Markdown file into a list of fenced code blocks.
 *
 * For each code block, we also collect all preceding text (headings, paragraphs,
 * list items, etc.) that appear between it and the previous code block.  This
 * text is used by path-resolution strategies to guess the intended file name.
 */
export function parseMarkdown(inputFile: string): CodeBlock[] {
  const source = readFileSync(inputFile, 'utf-8');
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(source);

  const blocks: CodeBlock[] = [];
  const children = tree.children as any[];
  let blockIndex = 0;

  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type !== 'code') continue;

    // Collect text from all nodes since the previous code block.
    const parts: string[] = [];
    for (let j = i - 1; j >= 0; j--) {
      const prev = children[j];
      if (prev.type === 'code') break;
      const txt = extractText(prev);
      if (txt) parts.unshift(txt);
    }

    blocks.push({
      lang: node.lang ?? undefined,
      value: node.value,
      meta: node.meta ?? undefined,
      precedingText: parts.join('\n').trim(),
      index: blockIndex++,
    });
  }

  return blocks;
}

/**
 * Recursively extract plain text from an mdast node.
 */
function extractText(node: any): string {
  if (!node) return '';
  switch (node.type) {
    case 'text':
      return node.value;
    case 'inlineCode':
      return `\`${node.value}\``;
    case 'strong':
      return `**${extractInlineChildren(node)}**`;
    case 'emphasis':
      return `*${extractInlineChildren(node)}*`;
    case 'delete':
      return `~~${extractInlineChildren(node)}~~`;
    case 'heading':
      return `${'#'.repeat(node.depth ?? 1)} ${extractInlineChildren(node)}`.trim();
    case 'paragraph':
      return extractInlineChildren(node);
    case 'blockquote': {
      const content = extractBlockChildren(node);
      return content
        .split('\n')
        .filter(Boolean)
        .map((line) => `> ${line}`)
        .join('\n');
    }
    case 'list':
      return (node.children ?? [])
        .map((child: any, index: number) =>
          extractText({
            ...child,
            _listMeta: { ordered: Boolean(node.ordered), index, start: node.start ?? 1 },
          })
        )
        .filter(Boolean)
        .join('\n');
    case 'listItem': {
      const meta = node._listMeta as { ordered: boolean; index: number; start: number } | undefined;
      const marker = meta?.ordered ? `${meta.start + meta.index}.` : '-';
      const content = extractBlockChildren(node);
      return content ? `${marker} ${content}` : marker;
    }
    default:
      if (Array.isArray(node.children)) {
        return extractBlockChildren(node);
      }
      return '';
  }
}

function extractInlineChildren(node: { children?: any[] }): string {
  return (node.children ?? []).map(extractText).join('');
}

function extractBlockChildren(node: { children?: any[] }): string {
  return (node.children ?? []).map(extractText).filter(Boolean).join('\n');
}
