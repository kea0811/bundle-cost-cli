---
name: bundle-cost-cli
description: Use when the user wants to measure or watch the over-the-wire size of their built bundles (raw, gzip, brotli). CLI that runs against built files (no bundler plugin required) and prints a colored delta on every save in watch mode. Can fail CI when a size budget is exceeded.
---

# bundle-cost-cli

Prints the real over-the-wire size (raw + gzip + brotli) for any built file. In watch mode, reprints a colored Δ-gzip column on every save.

## When to reach for this

User asks for:
- "how big is my bundle"
- "track bundle size on every save"
- "fail CI when bundle is too big"
- "watch bundle cost while I edit"

User does NOT mean this when they ask for:
- ❌ Webpack/Vite analyzer (treemap visualizer) — recommend `vite-bundle-visualizer` or similar.
- ❌ Tracking historical bundle size across PRs — different domain (use `pkg-size` or `size-limit` for that).

## Install

```bash
# global (so it's available anywhere)
pnpm add -g bundle-cost-cli

# or run without installing
pnpm dlx bundle-cost-cli dist/index.js
```

Node 18+. Zero runtime deps beyond an arg parser.

## Most common patterns

```bash
# print sizes for built files
bundle-cost dist/index.js dist/index.cjs

# watch mode — reprints with Δ-gzip on every save
bundle-cost dist/index.js --watch

# fail CI when over budget
bundle-cost dist/*.js --limit 50kb

# JSON output for build artifacts
bundle-cost dist/index.js --json
```

## Output (typical)

```
File              Raw       Gzip
dist/index.js     9.89 KB   3.37 KB
dist/index.cjs    11.87 KB  4.06 KB
total             21.76 KB  7.43 KB
```

Watch mode adds a `Δ gzip` column:
```
File              Raw       Gzip    Δ gzip
dist/index.js     10.4 KB   3.71 KB  +340 B   ← red when grown, green when shrunk
```

## Flags

| Flag | What |
|---|---|
| `-w, --watch` | reprint with Δ on every save |
| `-b, --brotli` | add a brotli column |
| `--no-gzip` | raw bytes only |
| `-j, --json` | machine-readable output |
| `-l, --limit <size>` | fail with exit 1 when total gzip > budget (e.g. `50kb`, `1.5mb`) |
| `--no-color` | disable ANSI colors (respects `NO_COLOR` env too) |

## CI recipe

```yaml
# .github/workflows/ci.yml step
- run: pnpm build
- run: pnpm dlx bundle-cost-cli dist/index.js --limit 50kb
```

## Programmatic API (the same building blocks)

```ts
import { measureFile, buildReport, renderReport, formatBytes } from 'bundle-cost-cli';

const size = await measureFile('dist/index.js');
console.log(`gzip: ${formatBytes(size.gzip)}`);
```

Useful if you're wiring bundle-cost into a custom script instead of using the CLI.

## Gotchas

1. **Measures the files you give it as-is.** It does NOT bundle, minify, or transform — point it at your already-built output, not source.
2. **`--watch` watches the file paths you pass.** If your bundler emits new files (e.g., chunked builds), pass a glob or rerun against the new file list.
3. **Brotli is opt-in via `--brotli`** because the JS brotli is slower; not needed when you just want a fast feedback loop.

## Links

- npm: https://www.npmjs.com/package/bundle-cost-cli
- landing: https://bundle-cost-cli.vercel.app
- repo: https://github.com/kea0811/bundle-cost-cli
