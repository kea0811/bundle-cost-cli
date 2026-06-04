import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/report.js';
import type { SizeSet } from '../src/types.js';

const a = { path: 'a.js', size: { raw: 100, gzip: 40, brotli: 35 } };
const b = { path: 'b.js', size: { raw: 200, gzip: 80, brotli: 70 } };

describe('buildReport', () => {
  it('has no deltas on a first run', () => {
    const report = buildReport([a, b]);
    expect(report.rows.map((r) => r.delta)).toEqual([null, null]);
    expect(report.total.size).toEqual({ raw: 300, gzip: 120, brotli: 105 });
    expect(report.total.delta).toBeNull();
  });

  it('computes per-file and total deltas against previous sizes', () => {
    const previous = new Map<string, SizeSet>([
      ['a.js', { raw: 90, gzip: 38, brotli: 33 }],
      ['b.js', { raw: 210, gzip: 82, brotli: 72 }],
    ]);
    const report = buildReport([a, b], previous);
    expect(report.rows[0].delta).toEqual({ raw: 10, gzip: 2, brotli: 2 });
    expect(report.rows[1].delta).toEqual({ raw: -10, gzip: -2, brotli: -2 });
    expect(report.total.delta).toEqual({ raw: 0, gzip: 0, brotli: 0 });
  });

  it('marks files with no previous entry as new while still totalling', () => {
    const previous = new Map<string, SizeSet>([['a.js', { raw: 90, gzip: 38, brotli: 33 }]]);
    const report = buildReport([a, b], previous);
    expect(report.rows[0].delta).toEqual({ raw: 10, gzip: 2, brotli: 2 });
    expect(report.rows[1].delta).toBeNull();
    expect(report.total.delta).toEqual({ raw: 210, gzip: 82, brotli: 72 });
  });
});
