import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { measureBuffer, measureFile } from '../src/sizes.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bundle-cost-sizes-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('measureBuffer', () => {
  it('reports raw, gzip and brotli byte counts', () => {
    const size = measureBuffer(Buffer.from('hello world'.repeat(20)));
    expect(size.raw).toBe(220);
    expect(size.gzip).toBeGreaterThan(0);
    expect(size.brotli).toBeGreaterThan(0);
  });

  it('handles an empty buffer', () => {
    const size = measureBuffer(Buffer.alloc(0));
    expect(size.raw).toBe(0);
    expect(size.gzip).toBeGreaterThan(0);
    expect(size.brotli).toBeGreaterThan(0);
  });
});

describe('measureFile', () => {
  it('measures a file on disk', async () => {
    const file = join(dir, 'bundle.js');
    const contents = 'export const answer = 42;\n'.repeat(10);
    await writeFile(file, contents);
    expect(await measureFile(file)).toEqual(measureBuffer(Buffer.from(contents)));
  });

  it('rejects when the file cannot be read', async () => {
    await expect(measureFile(join(dir, 'nope.js'))).rejects.toThrow();
  });
});
