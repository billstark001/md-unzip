# md-unzip

> **Unzip your Markdown.** Extract fenced code blocks into files.

`md-unzip` parses a Markdown document, guesses the intended file path for every
fenced code block, and writes the block contents to disk. It supports all
common LLM output formats (bold, headings, backticks, XML tags, fence meta,
etc.) plus a pluggable strategy system for custom extraction rules.

## Install

```bash
npm install -g md-unzip
# or
pnpm add -g md-unzip
```

After installation the `md-unzip` command is available globally.

## Usage

```bash
# Basic extraction
md-unzip -i README.md -o ./out

# Dry-run to preview changes
md-unzip -i README.md -o ./out --dry-run

# Only use specific strategies
md-unzip -i README.md -o ./out -s bold,comment-path

# Custom regex strategy
md-unzip -i README.md -o ./out -s regex -r "src/[a-z/]+\\.ts"

# Verbose mode
md-unzip -i README.md -o ./out -v
```

## Path Resolution Strategies

Strategies are tried **in order** until one succeeds for each code block.

| Strategy | Example Match |
|----------|---------------|
| `fence-meta` | \`\`\`ts path/to/file.ts |
| `xml-tag` | `<file name="path/to/file.ts">` |
| `heading` | ### path/to/file.ts |
| `backtick-heading` | ### \`path/to/file.ts\` |
| `heading-bold` | ### **path/to/file.ts** |
| `file-bold` | ### File: **path/to/file.ts** |
| `bold` | **path/to/file.ts** |
| `numbered-bold` | 1. **path/to/file.ts** |
| `numbered-backtick` | 1. \`path/to/file.ts\` |
| `colon` | path/to/file.ts: |
| `hash` | # path/to/file.ts |
| `inline-code` | \`path/to/file.ts\` |
| `path-string` | first POSIX-looking path |
| `regex` | user-supplied `--regex` |
| `comment-path` | // path/to/file.ts (first code line) |

## Safety

- Absolute paths in Markdown are **relativised** to the output directory.
- Directory traversal attempts (e.g. `../escape.ts`) are **skipped**.
- `--dry-run` shows exactly what would be written without touching disk.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

Built with `esbuild` into a single bundled ESM file, compatible with Node.js 18+
on Windows, macOS, and Linux.

## License

MIT
