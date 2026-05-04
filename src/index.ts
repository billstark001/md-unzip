import { parseMarkdown } from './parse.js';
import { resolvePaths } from './resolver.js';
import { writeFiles } from './writer.js';
import type { CodeBlock, ExtractedFile, Options, PathStrategy } from './types.js';

export { parseMarkdown, resolvePaths, writeFiles };
export type { CodeBlock, ExtractedFile, Options, PathStrategy };

/**
 * Full pipeline: parse → resolve → write.
 *
 * Returns the list of files that would be / were written.
 */
export function extract(
  options: Options,
): { files: ExtractedFile[]; result: ReturnType<typeof writeFiles> } {
  const blocks = parseMarkdown(options.inputFile);
  const files = resolvePaths(blocks, options.strategies as PathStrategy[], options.regex);
  const result = writeFiles(files, options.outputDir, options.dryRun);
  return { files, result };
}
