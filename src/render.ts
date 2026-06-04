import type { Colors } from './color.js';
import { formatBytes, formatDelta } from './format.js';
import type { Report, SizeSet } from './types.js';

export interface RenderOptions {
  /** Show the gzip column (and base the delta on gzip). */
  gzip: boolean;
  /** Show an extra brotli column. */
  brotli: boolean;
  /** Emit JSON instead of a table. */
  json: boolean;
  /** The color palette to paint with. */
  colors: Colors;
}

interface Cell {
  plain: string;
  colored: string;
}

const plainCell = (text: string): Cell => ({ plain: text, colored: text });

function colorDelta(delta: SizeSet | null, metric: keyof SizeSet, colors: Colors): Cell {
  if (delta === null) return { plain: 'new', colored: colors.cyan('new') };
  const value = delta[metric];
  const text = formatDelta(value);
  if (value < 0) return { plain: text, colored: colors.green(text) };
  if (value > 0) return { plain: text, colored: colors.red(text) };
  return { plain: text, colored: colors.dim(text) };
}

function buildCells(
  label: string,
  size: SizeSet,
  delta: SizeSet | null,
  metric: keyof SizeSet,
  hasDelta: boolean,
  options: RenderOptions,
  bold: boolean,
): Cell[] {
  const cells: Cell[] = [
    { plain: label, colored: bold ? options.colors.bold(label) : label },
    plainCell(formatBytes(size.raw)),
  ];
  if (options.gzip) cells.push(plainCell(formatBytes(size.gzip)));
  if (options.brotli) cells.push(plainCell(formatBytes(size.brotli)));
  if (hasDelta) cells.push(colorDelta(delta, metric, options.colors));
  return cells;
}

function renderJson(report: Report): string {
  return JSON.stringify(
    {
      files: report.rows.map((row) => ({
        path: row.path,
        raw: row.size.raw,
        gzip: row.size.gzip,
        brotli: row.size.brotli,
        delta: row.delta,
      })),
      total: {
        raw: report.total.size.raw,
        gzip: report.total.size.gzip,
        brotli: report.total.size.brotli,
        delta: report.total.delta,
      },
    },
    null,
    2,
  );
}

function renderTable(report: Report, options: RenderOptions): string {
  const metric: keyof SizeSet = options.gzip ? 'gzip' : 'raw';
  const hasDelta =
    report.rows.some((row) => row.delta !== null) || report.total.delta !== null;

  const headers = ['File', 'Raw'];
  if (options.gzip) headers.push('Gzip');
  if (options.brotli) headers.push('Brotli');
  if (hasDelta) headers.push(`Δ ${metric}`);

  const headerCells: Cell[] = headers.map((header) => ({
    plain: header,
    colored: options.colors.dim(header),
  }));
  const bodyRows = report.rows.map((row) =>
    buildCells(row.path, row.size, row.delta, metric, hasDelta, options, false),
  );
  const totalRow = buildCells(
    'total',
    report.total.size,
    report.total.delta,
    metric,
    hasDelta,
    options,
    true,
  );

  const matrix = [headerCells, ...bodyRows, totalRow];
  const widths = headers.map((_, column) =>
    Math.max(...matrix.map((row) => row[column].plain.length)),
  );

  return matrix
    .map((row) =>
      row
        .map((cell, column) => {
          const padding = ' '.repeat(widths[column] - cell.plain.length);
          // Left-align the file name, right-align every numeric column.
          return column === 0 ? cell.colored + padding : padding + cell.colored;
        })
        .join('  '),
    )
    .join('\n');
}

/** Render a report as either an aligned table or a JSON document. */
export function renderReport(report: Report, options: RenderOptions): string {
  return options.json ? renderJson(report) : renderTable(report, options);
}
