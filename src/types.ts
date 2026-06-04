/** The three sizes we report for a file or a total. */
export interface SizeSet {
  /** Uncompressed bytes on disk. */
  raw: number;
  /** Bytes after gzip — what most CDNs serve. */
  gzip: number;
  /** Bytes after brotli — what modern CDNs serve when the client supports it. */
  brotli: number;
}

/** A single measured file, keyed by the path the user typed. */
export interface FileMeasurement {
  path: string;
  size: SizeSet;
}

/** One row of a report: a file, its sizes, and the delta vs. the last run (if any). */
export interface ReportRow {
  path: string;
  size: SizeSet;
  /** `null` when there is no previous measurement to compare against. */
  delta: SizeSet | null;
}

/** A full report: every file plus a summed total. */
export interface Report {
  rows: ReportRow[];
  total: {
    size: SizeSet;
    delta: SizeSet | null;
  };
}
