/**
 * A job type. The engine (lib/jobs/engine.ts) knows nothing about the work:
 * it asks the handler for the next item after a cursor, runs it, saves the
 * cursor, and repeats in ~20 s slices chained across function calls.
 *
 * Items must come back in a stable order (e.g. by _id) so a cursor resumes
 * exactly where the last slice stopped. Running an item twice should be
 * harmless: after a crash the last item may run again.
 */
export type TJobHandler<O = Record<string, unknown>> = {
  type: string;
  /** Shown in the UI, e.g. "Re-mark all tests". */
  label: string;
  /** Who may start it. */
  adminOnly?: boolean;
  /** How many items there are, for the progress bar. */
  count: (options: O) => Promise<number>;
  /** The next item key after `cursor` (null = from the start), or null when done. */
  next: (cursor: string | null, options: O) => Promise<string | null>;
  /** Do the work for one item. Throw to record it as failed and move on. */
  run: (key: string, options: O) => Promise<void>;
  /** Optional once-at-the-end work, e.g. refreshing aggregates. */
  finish?: (options: O) => Promise<void>;
};
