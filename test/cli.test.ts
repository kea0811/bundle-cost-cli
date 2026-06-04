import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run, type RunDeps } from '../src/cli.js';

let dir: string;

interface Harness {
  out: string[];
  err: string[];
  deps: RunDeps;
  captured?: () => void | Promise<void>;
}

function harness(extra: Partial<RunDeps> = {}): Harness {
  const out: string[] = [];
  const err: string[] = [];
  const h: Harness = {
    out,
    err,
    deps: {
      log: (m) => out.push(m),
      error: (m) => err.push(m),
      cwd: dir,
      env: {},
      ...extra,
    },
  };
  return h;
}

function watchHarness(extra: Partial<RunDeps> = {}): Harness {
  const h = harness(extra);
  h.deps.watch = (_paths, onChange) => {
    h.captured = onChange;
    return () => {};
  };
  return h;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bundle-cost-cli-'));
  await writeFile(join(dir, 'small.js'), 'export const a = 1;\n');
  await writeFile(join(dir, 'big.js'), 'export const data = "x";\n'.repeat(40));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe('run', () => {
  it('measures files and prints a colored gzip table by default', async () => {
    const h = harness();
    const code = await run(['small.js', 'big.js'], h.deps);
    expect(code).toBe(0);
    expect(h.err).toEqual([]);
    const text = h.out.join('\n');
    expect(text).toContain('small.js');
    expect(text).toContain('big.js');
    expect(text).toContain('Gzip');
    expect(text).toContain('total');
    expect(text).toContain('['); // ANSI present (dim header)
  });

  it('prints JSON with --json and adds a brotli figure with --brotli', async () => {
    const h = harness();
    const code = await run(['small.js', '--brotli', '--json'], h.deps);
    expect(code).toBe(0);
    const parsed = JSON.parse(h.out[0]);
    expect(parsed.files[0].path).toBe('small.js');
    expect(parsed.files[0].brotli).toBeGreaterThan(0);
  });

  it('drops the gzip column and all color with --no-gzip --no-color', async () => {
    const h = harness();
    const code = await run(['small.js', '--no-gzip', '--no-color'], h.deps);
    expect(code).toBe(0);
    const text = h.out.join('\n');
    expect(text).not.toContain('Gzip');
    expect(text).not.toContain('['); // no ANSI escapes
  });

  it('honors the NO_COLOR environment variable', async () => {
    const h = harness({ env: { NO_COLOR: '1' } });
    const code = await run(['small.js'], h.deps);
    expect(code).toBe(0);
    expect(h.out.join('\n')).not.toContain('[');
  });

  it('passes when the total is within --limit', async () => {
    const h = harness();
    const code = await run(['small.js', '--limit', '1mb'], h.deps);
    expect(code).toBe(0);
    expect(h.out.join('\n')).toContain('within');
  });

  it('fails when the total exceeds --limit', async () => {
    const h = harness();
    const code = await run(['small.js', '--limit', '1b'], h.deps);
    expect(code).toBe(1);
    expect(h.err.join('\n')).toContain('exceeds');
  });

  it('rejects an unparseable --limit', async () => {
    const h = harness();
    const code = await run(['small.js', '--limit', 'enormous'], h.deps);
    expect(code).toBe(1);
    expect(h.err.join('\n')).toContain('Invalid size');
  });

  it('reports a read error and exits non-zero for a missing file', async () => {
    const h = harness();
    const code = await run(['ghost.js'], h.deps);
    expect(code).toBe(1);
    expect(h.err.join('\n')).toContain('Could not read file');
  });

  it('watches and prints a delta table on the next change', async () => {
    const h = watchHarness();
    const code = await run(['small.js', '--watch'], h.deps);
    expect(code).toBe(0);
    expect(h.out.join('\n')).toContain('watching');
    const before = h.out.length;

    await writeFile(join(dir, 'small.js'), 'export const a = 1234567890;\n'.repeat(3));
    await h.captured?.();

    expect(h.out.length).toBeGreaterThan(before);
    expect(h.out[h.out.length - 1]).toContain('Δ');
  });

  it('reports a read error from inside the watch loop', async () => {
    const h = watchHarness();
    await run(['small.js', '--watch'], h.deps);

    await rm(join(dir, 'small.js'));
    await h.captured?.();

    expect(h.err.join('\n')).toContain('Could not read file');
  });

  it('prints help with exit code 0', async () => {
    const h = harness();
    const code = await run(['--help'], h.deps);
    expect(code).toBe(0);
    expect(h.out.join('\n')).toContain('Examples');
  });

  it('errors with exit code 1 when no files are given', async () => {
    const h = harness();
    const code = await run([], h.deps);
    expect(code).toBe(1);
    expect(h.err.join('\n')).toContain('missing required argument');
  });

  it('falls back to real stdio and defaults when no deps are provided', async () => {
    const outSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const errSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    expect(await run(['--help'])).toBe(0);
    expect(await run([])).toBe(1);

    expect(outSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });
});
