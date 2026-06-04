import type { FileMeasurement, Report, ReportRow, SizeSet } from './types.js';

function subtract(next: SizeSet, prev: SizeSet): SizeSet {
  return {
    raw: next.raw - prev.raw,
    gzip: next.gzip - prev.gzip,
    brotli: next.brotli - prev.brotli,
  };
}

function sum(sizes: SizeSet[]): SizeSet {
  return sizes.reduce<SizeSet>(
    (acc, size) => ({
      raw: acc.raw + size.raw,
      gzip: acc.gzip + size.gzip,
      brotli: acc.brotli + size.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  );
}

/**
 * Combine a set of measurements into a report. Pass the `previous` sizes (keyed
 * by path) to compute per-file and total deltas; omit it for a first run.
 */
export function buildReport(
  measurements: FileMeasurement[],
  previous?: Map<string, SizeSet>,
): Report {
  const rows: ReportRow[] = measurements.map((measurement) => {
    const prev = previous?.get(measurement.path);
    return {
      path: measurement.path,
      size: measurement.size,
      delta: prev ? subtract(measurement.size, prev) : null,
    };
  });

  const totalSize = sum(measurements.map((m) => m.size));
  const previousTotal = previous ? sum([...previous.values()]) : undefined;

  return {
    rows,
    total: {
      size: totalSize,
      delta: previousTotal ? subtract(totalSize, previousTotal) : null,
    },
  };
}
