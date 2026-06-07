# bundle-cost-cli

![tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

> Print the real over-the-wire cost of your build output — and the delta on every save.

You already know your bundle is "kinda big." What you don't know, in the moment you add a dependency, is _how much_ bigger it just got. `bundle-cost` answers that in one line: point it at your built files and it prints raw, gzip, and (optionally) brotli sizes. Run it with `--watch` and it reprints a **delta** every time you save — so a stray `import { everything } from 'lodash'` shows up as `+71 KB` before you commit it, not after a user complains.

No bundler plugin, no config file, no telemetry. Just bytes.

## Install

**From GitHub** (always works):

```bash
pnpm add -g github:kea0811/bundle-cost-cli
```

**From npm** _(when published to npm)_:

```bash
pnpm add -g bundle-cost-cli
```

> Using npm or yarn? `npm install -g bundle-cost-cli` / `yarn global add bundle-cost-cli` work too. Or skip the install entirely and run it once with `pnpm dlx bundle-cost-cli dist/index.js` (`npx` works the same way).

Requires Node 18+.

## Quick start

Point it at one or more files:

```bash
bundle-cost dist/index.js dist/index.cjs
```

```text
File              Raw     Gzip
dist/index.js   9.89 KB  3.37 KB
dist/index.cjs  11.87 KB  4.06 KB
total           21.76 KB  7.43 KB
```

### Watch mode — a delta on every save

```bash
bundle-cost dist/index.js --watch
```

The first render is your baseline. Every save after that adds a `Δ gzip` column, colored green when you shrank it and red when you grew it:

```text
File              Raw     Gzip   Δ gzip
dist/index.js   10.4 KB  3.71 KB  +340 B
total           10.4 KB  3.71 KB  +340 B
```

Pair it with your bundler's own watch mode in another terminal and you get a live cost readout for free.

### Set a budget (great for CI)

```bash
bundle-cost dist/index.js --limit 50kb
```

If the **total gzip** size is over budget, `bundle-cost` prints a red `✗` line and exits with code `1` — so it fails your pipeline instead of silently shipping a regression. Under budget, it exits `0` with a green `✓`.

### Machine-readable output

```bash
bundle-cost dist/index.js --json
```

```json
{
  "files": [
    { "path": "dist/index.js", "raw": 10123, "gzip": 3451, "brotli": 3063, "delta": null }
  ],
  "total": { "raw": 10123, "gzip": 3451, "brotli": 3063, "delta": null }
}
```

Pipe it into `jq`, store it as a build artifact, or diff two runs yourself.

## Options

| Flag | Description |
| --- | --- |
| `-w, --watch` | Watch the files and print the size delta on every save. |
| `-b, --brotli` | Add a brotli column alongside gzip. |
| `--no-gzip` | Hide the gzip column (show raw bytes only). |
| `-j, --json` | Print machine-readable JSON instead of a table. |
| `-l, --limit <size>` | Fail (exit `1`) if total gzip exceeds this budget, e.g. `50kb`, `1.5mb`. |
| `--no-color` | Disable ANSI colors (also respects `NO_COLOR`). |
| `-h, --help` | Show usage and examples. |

Sizes accept `b`, `kb`, `mb`, `gb`, `tb` (case-insensitive), or a bare byte count.

## Programmatic API

The same building blocks ship as a typed ESM/CJS module, so you can wire bundle cost into your own scripts:

```ts
import { measureFile, buildReport, renderReport, formatBytes, createColors } from 'bundle-cost-cli';

const size = await measureFile('dist/index.js');
console.log(`gzip: ${formatBytes(size.gzip)}`);

const report = buildReport([{ path: 'dist/index.js', size }]);
console.log(renderReport(report, { gzip: true, brotli: false, json: false, colors: createColors(false) }));
```

`run(argv, deps)` is exported too — the whole CLI with injectable `log`, `error`, `cwd`, `env`, and `watch`, which is exactly how the test suite drives it.

## How it works

There's no minifier in here and no bundler hook. `bundle-cost` reads each file as-is and runs it through Node's built-in `zlib` — `gzipSync` and `brotliCompressSync` — because gzip and brotli are what a CDN actually serves. That keeps the tool dependency-light and honest: it measures the bytes you ship, not an estimate.

Watch mode keeps the previous measurement in memory and diffs against it, so the delta is always "since the last save in this session." All of the I/O — stdout, the filesystem watcher, the clock — is injected, which is why the test suite hits 100% coverage without touching your real terminal.

## Contributing

PRs welcome — especially new output formats and budget ergonomics. To hack on it:

```bash
pnpm install
pnpm test
pnpm build
```

`pnpm test:coverage` enforces 100% coverage, and `pnpm dev` rebuilds on change.

## License

MIT © [kea0811](https://github.com/kea0811)
