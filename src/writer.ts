import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, isAbsolute, relative, sep } from 'node:path';
import type { ExtractedFile } from './types.js';

export interface WriteResult {
  written: number;
  skipped: number;
  details: string[];
}

/**
 * Write extracted files to disk.
 *
 * Absolute paths are relativized to the output directory so that a document
 * containing /etc/config.yaml does not pollute the host root.
 * Intermediate directories are created automatically.
 *
 * When dryRun is true, no IO is performed — only log lines are emitted.
 */
export function writeFiles(
  files: ExtractedFile[],
  outputDir: string,
  dryRun: boolean,
): WriteResult {
  let written = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const file of files) {
    const candidatePath = file.path.trim();
    if (!candidatePath || candidatePath === '.' || candidatePath === '..' || /[\\/]$/.test(candidatePath)) {
      details.push(`[SKIP] invalid file path: ${file.path || '(empty)'}`);
      skipped++;
      continue;
    }

    let target: string;

    if (isAbsolute(candidatePath)) {
      target = resolve(outputDir, candidatePath.replace(/^[\\\/]/, ''));
    } else {
      target = resolve(outputDir, candidatePath);
    }

    const rel = relative(outputDir, target);
    if (rel.startsWith('..') || rel.startsWith('.' + sep)) {
      details.push(`[SKIP] traversal detected: ${file.path}`);
      skipped++;
      continue;
    }

    const dir = dirname(target);

    if (dryRun) {
      details.push(`[dry-run] would write ${target} (${file.content.length} chars)`);
      continue;
    }

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(target, file.content, 'utf-8');
    written++;
    details.push(`[OK] written ${target} (${file.content.length} chars)`);
  }

  return { written, skipped, details };
}
