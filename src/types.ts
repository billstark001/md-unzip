import { z } from 'zod';

/**
 * Supported strategies for extracting file paths from Markdown.
 */
export type PathStrategy =
  | 'inline-code'
  | 'path-string'
  | 'heading'
  | 'bold'
  | 'backtick-heading'
  | 'file-bold'
  | 'heading-bold'
  | 'numbered-bold'
  | 'numbered-backtick'
  | 'colon'
  | 'hash'
  | 'fence-meta'
  | 'regex'
  | 'comment-path'
  | 'xml-tag';

/**
 * Zod schema for CLI options.
 */
export const OptionsSchema = z.object({
  inputFile: z.string().min(1),
  outputDir: z.string().min(1),
  strategies: z.array(z.string()).min(1),
  regex: z.string().optional(),
  dryRun: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

export type Options = z.infer<typeof OptionsSchema>;

/**
 * A raw code block parsed from Markdown.
 */
export interface CodeBlock {
  lang?: string;
  value: string;
  meta?: string;
  /** Plain text between the previous code block and this one. */
  precedingText: string;
  /** Index of the code block in the document (0-based). */
  index: number;
}

/**
 * A file that has been extracted from a code block.
 */
export interface ExtractedFile {
  path: string;
  content: string;
  lang?: string;
}

/**
 * A strategy that can attempt to resolve a file path from a code block.
 */
export interface Strategy {
  name: PathStrategy;
  resolve: (block: CodeBlock, context?: { regex?: RegExp }) => string | undefined;
}
