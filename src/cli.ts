import { cac } from 'cac';
import { resolve } from 'node:path';
import { parseMarkdown } from './parse.js';
import { resolvePaths } from './resolver.js';
import { writeFiles } from './writer.js';
import { OptionsSchema } from './types.js';
import type { PathStrategy } from './types.js';

const VALID_STRATEGIES: readonly PathStrategy[] = [
  'fence-meta',
  'xml-tag',
  'heading',
  'backtick-heading',
  'heading-bold',
  'file-bold',
  'bold',
  'numbered-bold',
  'numbered-backtick',
  'colon',
  'hash',
  'inline-code',
  'path-string',
  'regex',
  'comment-path',
] as const;

const cli = cac('md-unzip');

cli
  .usage('[options]')
  .option('-i, --input <file>', 'Input markdown file')
  .option('-o, --output <dir>', 'Output directory')
  .option(
    '-s, --strategies <list>',
    'Comma-separated strategies. See README for full list.',
    { default: 'fence-meta,heading,backtick-heading,bold,inline-code,path-string,comment-path' },
  )
  .option('-r, --regex <pattern>', 'Regular expression for the regex strategy')
  .option('-d, --dry-run', 'Preview changes without writing files')
  .option('-v, --verbose', 'Print additional debug info')
  .help();

async function main() {
  const parsed = cli.parse();
  const opts = parsed.options;

  if (!opts.input || !opts.output) {
    console.error('Error: --input and --output are required');
    cli.outputHelp();
    process.exit(1);
  }

  const rawStrategies: string[] = opts.strategies.split(',').map((s: string) => s.trim());
  const invalid = rawStrategies.filter((s: string) => !VALID_STRATEGIES.includes(s as PathStrategy));
  if (invalid.length) {
    console.error(`Error: invalid strategies: ${invalid.join(', ')}`);
    console.error(`Valid: ${VALID_STRATEGIES.join(', ')}`);
    process.exit(1);
  }

  const strategies = rawStrategies as PathStrategy[];
  if (strategies.includes('regex') && !opts.regex) {
    console.error('Error: --regex is required when using the regex strategy');
    process.exit(1);
  }

  const inputFile = resolve(opts.input);
  const outputDir = resolve(opts.output);
  const dryRun = Boolean(opts.dryRun);
  const verbose = Boolean(opts.verbose);

  if (verbose) {
    console.log(`[verbose] input: ${inputFile}`);
    console.log(`[verbose] output: ${outputDir}`);
    console.log(`[verbose] strategies: ${strategies.join(', ')}`);
  }

  console.log(`Parsing ${inputFile}...`);
  const blocks = parseMarkdown(inputFile);
  console.log(`Found ${blocks.length} code block(s)`);

  const files = resolvePaths(blocks, strategies, opts.regex);
  console.log(`Resolved ${files.length} file(s) with strategies [${strategies.join(', ')}]`);

  const result = writeFiles(files, outputDir, dryRun);
  for (const d of result.details) console.log(d);
  console.log(`Done. Written: ${result.written}, Skipped: ${result.skipped}`);
  if (dryRun) console.log('Dry run mode — no files were actually written.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
