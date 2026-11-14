# 05 · Performance plan (frontend + backend)

Speed is part of the UX (see 01 §3). Target numbers and concrete work items,
ordered by expected impact per effort.

## Budgets (field data, p75)

| Metric | Target | Why |
|---|---|---|
| LCP | ≤ 2.5 s on 4G phone | Core Web Vital "good" [1] |
| INP | ≤ 200 ms | Core Web Vital "good"; mostly main-thread work [1][2] |
| CLS | ≤ 0.1 | skeletons must match final layout |
| API p75 (list endpoints, warm) | ≤ 300 ms server time | 0.1 s / 1 s limits feel |
| Route JS (first load, per page) | track; no page > +20 % after revamp | heavy libs behind `dynamic()` |

Measure with `useReportWebVitals` in a small client component (not by
turning the root layout into a client component), using `onINP` (FID is
gone). [1] Log API timings with `Server-Timing` headers so they show in
devtools.

## Backend

### B1. Run functions next to the database — highest impact

Vercel functions default to **`iad1` (Washington DC)**. [3] Users are in
India. Check the Atlas cluster region (Atlas UI → cluster → region). Then
set `"regions": ["bom1"]` (Mumbai) in `vercel.json` if Atlas is
`ap-south-1`, or the Vercel region nearest to Atlas otherwise. Each page
load does several DB round trips (auth + data), and each cross-continent
round trip costs ~200 ms+; reports show 4 s → 300 ms from fixing this. [3]

### B2. Cache the Mongo connection

`lib/dbUtils.ts` calls `mongoose.connect()` on every request with no cached
promise. Standard serverless pattern: [4]

```ts
const cached = (globalThis as any).__mongoose ??= { conn: null, promise: null };
export const dbConnect = async () => {
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(dbURL, { maxPoolSize: 10, bufferCommands: false });
  try { cached.conn = await cached.promise; }
  catch (e) { cached.promise = null; throw e; }
  return cached.conn;
};
```

Note: today errors are swallowed (`console.log`) and the route continues;
the new version throws so the route returns a real error. Check callers.

### B3. Indexes (ESR: Equality → Sort → Range) [5]

Only `AnswerSheet` defines an index today. Add in the schema files, verify
with `.explain("executionStats")` (look for `IXSCAN`, no in-memory `SORT`):

| Collection | Query | Index |
|---|---|---|
| questions | `{chapter, mark?, tags?, timesUsed?}` sort `createdAt,_id` desc | `{chapter:1, createdAt:-1, _id:-1}`; consider `{chapter:1, mark:1, createdAt:-1}` |
| questions | paper generation by chapter + marks/tags | covered by the above / `{chapter:1, tags:1}` |
| papers | `{author?, course?, status?}` sort `createdAt` | `{author:1, createdAt:-1}`, `{course:1, status:1, createdAt:-1}` |
| users | `batchIds` (counts, attendance rosters, messaging) | `{batchIds:1}` |
| attendance | `{batch, date}` | `{batch:1, date:1}` — **non-unique** (BUGS.md #2 is a decision) |
| chapters | `{book}` / `{course, subject}` sort `order` | `{book:1, order:1}`, `{course:1, subject:1, order:1}` |
| exam results / fees / schedule papers | by batch / user | add after reading those routes |

Create indexes in Atlas during low traffic; Mongoose `autoIndex` in
production is fine for small collections but prefer explicit
`syncIndexes()` once.

### B4. Parallelise and trim queries

- List routes run `find()` then `countDocuments()` sequentially →
  `Promise.all([...])`. (papers, question).
- `/api/batches?withCount=true` unwinds **every user**; add
  `{ $match: { batchIds: { $in: batchIds } } }` first (uses the new index).
- `/api/chapter` GET has no `.lean()`; add it (and check other GETs).
- `.lean()` + `.select()` on every read that doesn't need full docs (papers
  list already shows the pattern and saved ~300 KB/page).
- Avoid N+1 populates; prefer one `populate` with a `select`.

### B5. Auth on every navigation

`(root)/layout.tsx` calls `getAccount()` → JWT verify **and** a DB read on
every page render; the middleware already verified the JWT for API calls.
Options (pick in the shell spec):
1. Wrap `getAccount` in React `cache()` so one render does one read.
2. Put the fields the shell needs (name, role, courses) in the JWT and only
   read the DB when an account page needs fresh data.

### B6. HTTP caching

- Reuse `jsonRevalidated` (ETag/304) on all read-heavy GETs (books,
  chapters, batches, users, courses, authors).
- Static-ish reference data (courses, subjects, books list) can use
  `Cache-Control: private, max-age=60, stale-while-revalidate=600`.
- Add `Server-Timing: db;dur=…` to measure.

### B7. Fix the middleware gap while there

BUGS.md #1 (tokenless requests pass). Not performance, but every route is
touched in this work; fix + audit together.

## Frontend

### F1. One data layer: SWR everywhere

Half the hooks use SWR, half use `useState/useEffect` (e.g. `useBatches`,
fetched again on every mount, no dedupe). Move all to SWR with shared
config: `dedupingInterval`, `keepPreviousData`, `revalidateOnFocus` on for
attendance/fees (multi-device), off for question bank. Mutations use
`mutate` with `optimisticData` + `rollbackOnError`. [6] Result: instant
back-navigation and fewer requests.

### F2. Ship less JavaScript

- `mathpix-markdown-it` is heavy and `MathpixProvider` is mounted in **both**
  `(root)/layout.tsx` and `(root)/(mathpix)/layout.tsx`. Mount it only in
  the `(mathpix)` group (and in sheets that render math), so Attendance,
  Fees, etc. don't download it.
- `next/dynamic` for heavy sheets (face capture/enroll, variants, markdown
  editor, question analyzer, diagram prompt).
- Remove the duplicate toast system (Radix toast → Sonner).
- Run `@next/bundle-analyzer` before and after each page; record in the page
  spec.
- `lucide-react` is already optimised by Next's default
  `optimizePackageImports`; no config needed. [7]
- `motion` only via `LazyMotion` (see 02).

### F3. Server components for shells

Most pages are `"use client"` at the top (the paper pages already delegate to `modules/`). When a page is revamped, make
`page.tsx` a server component that renders the static shell (header, layout)
and pushes `"use client"` down to the interactive parts. Less JS, faster
LCP. [2]

### F4. Instant navigation feedback

- Add `loading.tsx` per route segment with the page's skeleton → shows
  immediately on navigation (App Router streams it).
- Keep `nextjs-toploader`; make it brand-colored and thin.
- `<Link>` prefetch is on by default in production; keep nav as `<Link>`.

### F5. INP hygiene

- No heavy work in click handlers; defer with `startTransition` for
  filter/sort/search updates on big lists.
- Debounce search inputs; virtualise or `content-visibility` long lists
  (already used — keep it).
- Animate only transform/opacity.

### F6. Fonts & images

- Lato: load 400 + 700 only (currently 100/300/400/700).
- `next/image` with `sizes` for photos (face enrollment previews, question
  images); `public/` PNG logos → optimised; SVG illustrations inline.

### F7. PWA niceties (optional)

`theme-color`, proper icons already exist. A service worker for offline is
**out of scope** (data must be fresh).

## Verification per change

1. Lighthouse mobile run before/after on the page (lab check).
2. Network tab: request count and transferred bytes before/after.
3. For API work: `Server-Timing` or logs before/after, warm and cold.
4. Record numbers in the page spec.

## Sources

1. [Core Web Vitals checklist 2026](https://pkglog-com.pages.dev/en/blog/web-performance-core-web-vitals-en/); Vercel — [Optimizing Core Web Vitals](https://examples.vercel.com/guides/optimizing-core-web-vitals-in-2024)
2. [Optimizing Next.js App Router for CWV](https://dev.to/aon_infotech_3a1b6ff525fc/optimizing-nextjs-app-router-for-core-web-vitals-a-practical-guide-11if); Preply — [Improving INP on Next.js](https://medium.com/preply-engineering/how-preply-improved-inp-on-a-next-js-application-without-react-server-components-and-app-router-491713149875)
3. Vercel — [Configuring function regions](https://vercel.com/docs/functions/configuring-functions/region), [Choosing deployment regions](https://vercel.com/guides/choosing-deployment-regions); [Reducing latency with Mongo in Asia](https://nextjs-forum-web.vercel.app/post/1368516788379193394)
4. [MongoDB with Vercel serverless](https://oneuptime.com/blog/post/2026-03-31-mongodb-vercel-serverless-functions/view); MongoDB forum — [Large number of connections with Mongoose and Vercel](https://www.mongodb.com/community/forums/t/large-number-of-connections-with-mongoose-and-vercel/204917)
5. MongoDB — [The ESR Guideline](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/), [Compound indexes](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/)
6. SWR — [Mutation & Revalidation](https://swr.vercel.app/docs/mutation)
7. Next.js — [optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports), [Package bundling guide](https://nextjs.org/docs/app/guides/package-bundling)
