import * as fs from 'node:fs';

/** A close handle returned by a watcher. */
export interface Closeable {
  close(): void;
}

/** How a single path gets watched. Swappable so the orchestration is testable. */
export type WatchImpl = (path: string, onChange: () => void) => Closeable;

const defaultImpl: WatchImpl = (path, onChange) => {
  const watcher = fs.watch(path, () => onChange());
  return { close: () => watcher.close() };
};

/**
 * Watch every path and call `onChange` whenever any of them changes.
 * Returns a function that stops every watcher.
 */
export function watchPaths(
  paths: string[],
  onChange: () => void,
  impl: WatchImpl = defaultImpl,
): () => void {
  const watchers = paths.map((path) => impl(path, onChange));
  return () => {
    for (const watcher of watchers) watcher.close();
  };
}
