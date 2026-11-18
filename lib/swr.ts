import { mutate, type SWRConfiguration } from "swr";

// Shared options for list hooks. Cached data shows instantly when a page is
// opened again and is refreshed in the background (revalidateIfStale stays
// on: these lists change during the day). Not on window focus: switching back
// to the tab re-fetching every list was noise, and the pages have Refresh.
export const LIST_SWR: SWRConfiguration = {
  revalidateOnFocus: false,
  errorRetryCount: 1,
};

// "Loading" for a hook means a request is in flight, first load or refresh,
// as the hand-written hooks reported it
export const swrLoading = (s: { isLoading: boolean; isValidating: boolean }) => s.isLoading || s.isValidating;

export const swrError = (err: unknown, fallback: string) => (err ? (err as Error)?.message || fallback : undefined);

// ---------------------------------------------------------------------------
// Cache invalidation after writes.
//
// Every successful write through the api client (see lib/api.ts) refreshes the
// cached lists that depend on it, wherever they are shown, so an edit in one
// panel never leaves a stale list on another part of the dashboard. Keys are
// either arrays named by their first item (["users", batchId]) or strings
// that start with an endpoint name ("chapter" + ids). Mounted lists re-fetch
// now; the rest re-fetch when next shown (revalidateIfStale).


type TFamily =
  | "users"
  | "batches"
  | "fees"
  | "attendance"
  | "accounts"
  | "schedule-papers"
  | "answer-sheets"
  | "books"
  | "chapter"
  | "question"
  | "papers"
  | "student"
  | "batch-insights"
  | "student-insights"
  | "dev-suggestions";

// Write endpoint (path prefix, longest first) → the lists it can change
const WRITE_EFFECTS: [string, TFamily[]][] = [
  // Reads or side work done with POST: nothing to refresh
  ["papers/generate", []],
  ["attendance/capture", []],
  ["uploads/sign", []],
  // Background jobs: the page refreshes what a job changed when it ends
  ["jobs", []],
  ["ai/", []],
  ["auth/login", []],
  ["auth/user", []],
  ["auth/logout", []],
  // Writes
  ["auth/accounts", ["accounts"]],
  ["face/", ["users", "student"]],
  ["users", ["users", "batches", "fees", "attendance", "student"]],
  ["batches", ["batches", "users", "fees", "attendance", "student"]],
  ["fees", ["fees", "student"]],
  ["attendance", ["attendance", "student"]],
  ["exam-results", ["student"]],
  ["schedule-paper", ["schedule-papers"]],
  ["answer-sheets", ["answer-sheets", "schedule-papers", "student", "student-insights", "batch-insights", "question"]],
  ["question-stats", ["question", "student", "student-insights", "batch-insights"]],
  ["books", ["books", "chapter"]],
  ["chapter", ["chapter", "question"]],
  ["bulk/question", ["question", "papers"]],
  ["questions/used", ["question", "papers"]],
  // Editing a question can re-mark the tests it was in (lib/recheck)
  ["question", ["question", "papers", "answer-sheets", "schedule-papers", "student", "student-insights", "batch-insights"]],
  ["papers", ["papers"]],
  ["dev-suggestions", ["dev-suggestions"]],
];

const pathOf = (url?: string) =>
  (url ?? "")
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+/, "")
    .replace(/^api\//, "");

const keyFamily = (key: unknown): string | undefined => {
  if (Array.isArray(key)) return typeof key[0] === "string" ? key[0] : undefined;
  return typeof key === "string" ? key : undefined;
};

export const invalidateAfterWrite = (url?: string) => {
  const path = pathOf(url);
  const rule = WRITE_EFFECTS.find(([prefix]) => path.startsWith(prefix));
  const families = rule ? rule[1] : [];
  if (!families.length) return;
  mutate(
    (key) => {
      const family = keyFamily(key);
      // Array keys match their name; string keys match by prefix ("chapter…")
      return Boolean(family && families.some((f) => (Array.isArray(key) ? family === f : family.startsWith(f))));
    }
    // No data argument: a plain re-fetch, keeping what's on screen meanwhile
  );
};
