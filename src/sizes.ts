import { readFile } from 'node:fs/promises';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import type { SizeSet } from './types.js';

/** Measure raw, gzip, and brotli sizes of an in-memory buffer. */
export function measureBuffer(buffer: Buffer): SizeSet {
  return {
    raw: buffer.byteLength,
    gzip: gzipSync(buffer).byteLength,
    brotli: brotliCompressSync(buffer).byteLength,
  };
}

/** Read a file from disk and measure it. Rejects if the file can't be read. */
export async function measureFile(path: string): Promise<SizeSet> {
  const buffer = await readFile(path);
  return measureBuffer(buffer);
}
