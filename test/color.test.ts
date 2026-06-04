import { describe, expect, it } from 'vitest';
import { createColors } from '../src/color.js';

describe('createColors', () => {
  it('wraps text in ANSI codes when enabled', () => {
    const colors = createColors(true);
    expect(colors.green('x')).toBe('[32mx[39m');
    expect(colors.red('x')).toBe('[31mx[39m');
    expect(colors.dim('x')).toBe('[2mx[22m');
    expect(colors.cyan('x')).toBe('[36mx[39m');
    expect(colors.bold('x')).toBe('[1mx[22m');
  });

  it('is the identity when disabled', () => {
    const colors = createColors(false);
    expect(colors.green('x')).toBe('x');
    expect(colors.red('x')).toBe('x');
    expect(colors.dim('x')).toBe('x');
    expect(colors.cyan('x')).toBe('x');
    expect(colors.bold('x')).toBe('x');
  });
});
