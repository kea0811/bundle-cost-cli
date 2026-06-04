import { describe, expect, it } from 'vitest';
import { createColors } from '../src/color.js';
import { renderReport, type RenderOptions } from '../src/render.js';
import { buildReport } from '../src/report.js';
import type { SizeSet } from '../src/types.js';

const options = (overrides: Partial<RenderOptions> = {}): RenderOptions => ({
  gzip: true,
  brotli: false,
  json: false,
  colors: createColors(false),
  ...overrides,
});

describe('renderReport (table)', () => {
  it('prints a header, a row and a bold total with no delta column on a first run', () => {
    const report = buildReport([{ path: 'a.js', size: { raw: 1024, gzip: 512, brotli: 400 } }]);
    const out = renderReport(report, options());
    expect(out).toContain('File');
    expect(out).toContain('Gzip');
    expect(out).toContain('a.js');
    expect(out).toContain('total');
    expect(out).toContain('1.00 KB');
    expect(out).not.toContain('Δ');
  });

  it('omits the gzip column and uses raw as the metric when gzip is off', () => {
    const report = buildReport([{ path: 'a.js', size: { raw: 2048, gzip: 512, brotli: 400 } }]);
    const out = renderReport(report, options({ gzip: false }));
    expect(out).not.toContain('Gzip');
    expect(out).toContain('Raw');
  });

  it('colors deltas: green shrink, red growth, dim no-change, cyan new', () => {
    const measurements = [
      { path: 'shrink.js', size: { raw: 100, gzip: 40, brotli: 30 } },
      { path: 'grow.js', size: { raw: 100, gzip: 60, brotli: 50 } },
      { path: 'same.js', size: { raw: 100, gzip: 50, brotli: 40 } },
      { path: 'fresh.js', size: { raw: 100, gzip: 55, brotli: 45 } },
    ];
    const previous = new Map<string, SizeSet>([
      ['shrink.js', { raw: 100, gzip: 50, brotli: 40 }],
      ['grow.js', { raw: 100, gzip: 50, brotli: 40 }],
      ['same.js', { raw: 100, gzip: 50, brotli: 40 }],
    ]);
    const report = buildReport(measurements, previous);
    const out = renderReport(report, options({ brotli: true, colors: createColors(true) }));

    expect(out).toContain('Brotli');
    expect(out).toContain('Δ gzip');
    expect(out).toContain('[32m'); // green shrink
    expect(out).toContain('[31m'); // red growth
    expect(out).toContain('[2m'); // dim no-change
    expect(out).toContain('[36mnew'); // cyan new file
  });
});

describe('renderReport (json)', () => {
  it('emits every size plus a null delta on a first run', () => {
    const report = buildReport([{ path: 'a.js', size: { raw: 10, gzip: 8, brotli: 6 } }]);
    const parsed = JSON.parse(renderReport(report, options({ json: true })));
    expect(parsed.files[0]).toEqual({ path: 'a.js', raw: 10, gzip: 8, brotli: 6, delta: null });
    expect(parsed.total).toEqual({ raw: 10, gzip: 8, brotli: 6, delta: null });
  });

  it('includes computed deltas when previous sizes exist', () => {
    const previous = new Map<string, SizeSet>([['a.js', { raw: 1000, gzip: 500, brotli: 390 }]]);
    const report = buildReport([{ path: 'a.js', size: { raw: 1024, gzip: 512, brotli: 400 } }], previous);
    const parsed = JSON.parse(renderReport(report, options({ json: true })));
    expect(parsed.files[0].delta).toEqual({ raw: 24, gzip: 12, brotli: 10 });
    expect(parsed.total.delta).toEqual({ raw: 24, gzip: 12, brotli: 10 });
  });
});
