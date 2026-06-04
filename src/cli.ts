import { resolve } from 'node:path';
import { Command, type CommanderError } from 'commander';
import { type Colors, createColors } from './color.js';
import { formatBytes, parseSize } from './format.js';
import { renderReport, type RenderOptions } from './render.js';
import { buildReport } from './report.js';
import { measureFile } from './sizes.js';
import type { FileMeasurement, SizeSet } from './types.js';
import { watchPaths } from './watch.js';

/** Hooks the test suite swaps in; production code falls back to real I/O. */
export interface RunDeps {
  log?: (message: string) => void;
  error?: (message: string) => void;
  cwd?: string;
  env?: Record<string, string | undefined>;
  watch?: typeof watchPaths;
}

interface CliOptions {
  watch?: boolean;
  brotli?: boolean;
  gzip?: boolean;
  json?: boolean;
  limit?: string;
  color?: boolean;
}

interface ExecuteContext {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: string;
  env: Record<string, string | undefined>;
  watch: typeof watchPaths;
}

interface Target {
  label: string;
  path: string;
}

interface Measured extends Target {
  size: SizeSet;
}

const DESCRIPTION =
  'Print the gzipped bundle cost of your files — and the delta on every save.';

const HELP_EXAMPLES = `
Examples:
  $ bundle-cost dist/index.js
  $ bundle-cost dist/*.js --brotli
  $ bundle-cost dist/index.js --limit 50kb
  $ bundle-cost dist/index.js --watch
  $ bundle-cost dist/index.js --json
`;

const trimTrailingNewline = (text: string): string => text.replace(/\n+$/, '');

async function measureAll(targets: Target[]): Promise<Measured[]> {
  return Promise.all(
    targets.map(async (target) => ({ ...target, size: await measureFile(target.path) })),
  );
}

const toMeasurements = (measured: Measured[]): FileMeasurement[] =>
  measured.map((m) => ({ path: m.label, size: m.size }));

const snapshot = (measured: Measured[]): Map<string, SizeSet> =>
  new Map(measured.map((m) => [m.label, m.size]));

function startWatch(
  targets: Target[],
  renderOptions: RenderOptions,
  initial: Measured[],
  ctx: ExecuteContext,
): void {
  let previous = snapshot(initial);
  ctx.log(renderOptions.colors.dim('watching for changes… (ctrl-c to stop)'));

  ctx.watch(
    targets.map((target) => target.path),
    async () => {
      let next: Measured[];
      try {
        next = await measureAll(targets);
      } catch (err) {
        ctx.error(renderOptions.colors.red(`Could not read file: ${(err as Error).message}`));
        return;
      }
      ctx.log(renderReport(buildReport(toMeasurements(next), previous), renderOptions));
      previous = snapshot(next);
    },
  );
}

function reportBudget(
  totalGzip: number,
  limit: number,
  colors: Colors,
  ctx: ExecuteContext,
): number {
  const headline = `${formatBytes(totalGzip)} gzip`;
  if (totalGzip > limit) {
    ctx.error(colors.red(`✗ ${headline} exceeds the ${formatBytes(limit)} budget`));
    return 1;
  }
  ctx.log(colors.green(`✓ ${headline} is within the ${formatBytes(limit)} budget`));
  return 0;
}

async function execute(files: string[], options: CliOptions, ctx: ExecuteContext): Promise<number> {
  const colorsEnabled = options.color !== false && !ctx.env.NO_COLOR;
  const renderOptions: RenderOptions = {
    gzip: options.gzip !== false,
    brotli: options.brotli === true,
    json: options.json === true,
    colors: createColors(colorsEnabled),
  };

  let limit: number | undefined;
  if (options.limit !== undefined) {
    try {
      limit = parseSize(options.limit);
    } catch (err) {
      ctx.error(renderOptions.colors.red((err as Error).message));
      return 1;
    }
  }

  const targets: Target[] = files.map((file) => ({ label: file, path: resolve(ctx.cwd, file) }));

  let measured: Measured[];
  try {
    measured = await measureAll(targets);
  } catch (err) {
    ctx.error(renderOptions.colors.red(`Could not read file: ${(err as Error).message}`));
    return 1;
  }

  const report = buildReport(toMeasurements(measured));
  ctx.log(renderReport(report, renderOptions));

  if (options.watch) {
    startWatch(targets, renderOptions, measured, ctx);
    return 0;
  }

  if (limit !== undefined) {
    return reportBudget(report.total.size.gzip, limit, renderOptions.colors, ctx);
  }

  return 0;
}

/**
 * Parse `argv` (user args, without `node` and the script path) and run the CLI.
 * Returns the process exit code. All I/O is injectable via {@link RunDeps}.
 */
export async function run(argv: string[], deps: RunDeps = {}): Promise<number> {
  const log = deps.log ?? ((message) => process.stdout.write(`${message}\n`));
  const error = deps.error ?? ((message) => process.stderr.write(`${message}\n`));
  const ctx: ExecuteContext = {
    log,
    error,
    cwd: deps.cwd ?? process.cwd(),
    env: deps.env ?? process.env,
    watch: deps.watch ?? watchPaths,
  };

  const program = new Command();
  program
    .name('bundle-cost')
    .description(DESCRIPTION)
    .argument('<files...>', 'one or more files to measure (e.g. dist/index.js)')
    .option('-w, --watch', 'watch the files and print the size delta on every save')
    .option('-b, --brotli', 'include a brotli column alongside gzip')
    .option('--no-gzip', 'hide the gzip column (show raw bytes only)')
    .option('-j, --json', 'print machine-readable JSON instead of a table')
    .option('-l, --limit <size>', 'fail if the total gzip size exceeds this budget (e.g. 50kb)')
    .option('--no-color', 'disable ANSI colors')
    .addHelpText('after', HELP_EXAMPLES)
    .exitOverride()
    .configureOutput({
      writeOut: (text) => log(trimTrailingNewline(text)),
      writeErr: (text) => error(trimTrailingNewline(text)),
    });

  let exitCode = 0;
  program.action(async (files: string[], options: CliOptions) => {
    exitCode = await execute(files, options, ctx);
  });

  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (err) {
    // exitOverride() turns help/version/parse failures into a thrown
    // CommanderError, which always carries a numeric exit code.
    return (err as CommanderError).exitCode;
  }
  return exitCode;
}
