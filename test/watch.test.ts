import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({ watch: vi.fn() }));

import * as fs from 'node:fs';
import { watchPaths, type Closeable, type WatchImpl } from '../src/watch.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('watchPaths', () => {
  it('wires a watcher per path and stops them all on close', () => {
    const listeners: Array<() => void> = [];
    const closes: Array<() => void> = [];
    const impl: WatchImpl = (_path, onChange) => {
      listeners.push(onChange);
      const close = vi.fn();
      closes.push(close);
      return { close } satisfies Closeable;
    };

    const onChange = vi.fn();
    const stop = watchPaths(['a.js', 'b.js'], onChange, impl);
    expect(listeners).toHaveLength(2);

    listeners[0]();
    listeners[1]();
    expect(onChange).toHaveBeenCalledTimes(2);

    stop();
    for (const close of closes) expect(close).toHaveBeenCalledTimes(1);
  });

  it('uses fs.watch by default and forwards change events', () => {
    const watcher = { close: vi.fn() };
    let captured: (() => void) | undefined;
    vi.mocked(fs.watch).mockImplementation(((_path: string, listener: () => void) => {
      captured = listener;
      return watcher;
    }) as unknown as typeof fs.watch);

    const onChange = vi.fn();
    const stop = watchPaths(['x.js'], onChange);

    expect(fs.watch).toHaveBeenCalledWith('x.js', expect.any(Function));
    captured?.();
    expect(onChange).toHaveBeenCalledTimes(1);

    stop();
    expect(watcher.close).toHaveBeenCalledTimes(1);
  });
});
