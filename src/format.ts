const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

const SIZE_RE = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?$/i;

const MULTIPLIERS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
};

/**
 * Render a non-negative byte count as a human-friendly string.
 * Bytes are shown whole; everything larger gets two decimals.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1) return '0 B';
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const rendered = exponent === 0 ? String(Math.round(value)) : value.toFixed(2);
  return `${rendered} ${UNITS[exponent]}`;
}

/**
 * Render a signed delta, e.g. `+1.20 KB`, `-512 B`, or `0 B` for no change.
 */
export function formatDelta(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sign = bytes > 0 ? '+' : '-';
  return `${sign}${formatBytes(Math.abs(bytes))}`;
}

/**
 * Parse a human size budget like `50kb`, `1.5mb`, or a raw byte count.
 * Throws on anything it can't make sense of.
 */
export function parseSize(input: string): number {
  const match = SIZE_RE.exec(input.trim());
  if (!match) {
    throw new Error(
      `Invalid size: "${input}" (try "50kb", "1.5mb", or a raw byte count)`,
    );
  }
  const value = Number(match[1]);
  const unit = (match[2] ?? 'b').toLowerCase();
  return Math.round(value * MULTIPLIERS[unit]);
}
