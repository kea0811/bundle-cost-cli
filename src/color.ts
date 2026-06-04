/** A small set of ANSI color helpers. When disabled, every helper is the identity. */
export interface Colors {
  green(text: string): string;
  red(text: string): string;
  dim(text: string): string;
  cyan(text: string): string;
  bold(text: string): string;
}

function wrap(open: number, close: number): (text: string) => string {
  return (text) => `[${open}m${text}[${close}m`;
}

const identity = (text: string): string => text;

/**
 * Build a {@link Colors} palette. Pass `false` (no TTY, `NO_COLOR`, `--no-color`)
 * to get a palette where every helper returns its input untouched.
 */
export function createColors(enabled: boolean): Colors {
  if (!enabled) {
    return { green: identity, red: identity, dim: identity, cyan: identity, bold: identity };
  }
  return {
    green: wrap(32, 39),
    red: wrap(31, 39),
    dim: wrap(2, 22),
    cyan: wrap(36, 39),
    bold: wrap(1, 22),
  };
}
