import { describe, expect, it } from 'vitest';
import { name } from '../src/index.js';

describe('scaffold', () => {
  it('exposes the package name', () => {
    expect(name).toBe('bundle-cost-cli');
  });
});
