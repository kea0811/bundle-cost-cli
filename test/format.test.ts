import { describe, expect, it } from 'vitest';
import { formatBytes, formatDelta, parseSize } from '../src/format.js';

describe('formatBytes', () => {
  it('renders zero and sub-byte values as "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(0.4)).toBe('0 B');
  });

  it('rounds whole bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('renders KB, MB and GB with two decimals', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(1024 ** 2)).toBe('1.00 MB');
    expect(formatBytes(1024 ** 3)).toBe('1.00 GB');
  });

  it('clamps absurdly large values to the biggest unit', () => {
    expect(formatBytes(2 ** 60)).toBe('1048576.00 TB');
  });
});

describe('formatDelta', () => {
  it('shows no change as "0 B"', () => {
    expect(formatDelta(0)).toBe('0 B');
  });

  it('prefixes growth with + and shrink with -', () => {
    expect(formatDelta(1024)).toBe('+1.00 KB');
    expect(formatDelta(-512)).toBe('-512 B');
  });
});

describe('parseSize', () => {
  it('parses unit suffixes case-insensitively, with optional whitespace', () => {
    expect(parseSize('50kb')).toBe(50 * 1024);
    expect(parseSize('100 KB')).toBe(100 * 1024);
    expect(parseSize('2GB')).toBe(2 * 1024 ** 3);
    expect(parseSize('1tb')).toBe(1024 ** 4);
    expect(parseSize('  256b ')).toBe(256);
  });

  it('treats a bare number as raw bytes', () => {
    expect(parseSize('1024')).toBe(1024);
  });

  it('rounds fractional results', () => {
    expect(parseSize('1.5mb')).toBe(Math.round(1.5 * 1024 ** 2));
  });

  it('throws on anything it cannot parse', () => {
    expect(() => parseSize('huge')).toThrow(/Invalid size/);
  });
});
