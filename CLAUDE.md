# CLAUDE.md

Guidance for Claude (and humans) working in this repository.

## What this app is

**Education+ Test Gen** — an internal web app for the Education+ coaching
institute (Ajmer). Teachers and admins use it to:

- build question papers by hand (**Create Paper**) or automatically by
  chapter / marks / tag quotas (**Generate Paper**), preview and print them
  (student copy, MCQ answer key, teacher copy), save and merge papers;
- maintain the question bank (**Upload** Mathpix markdown, **Questions**,
  **Chapters**, **Books**), including AI question variants (Gemini) and
  AI-generated diagram prompts;
- run the institute: **Users** (students), **Batches** (+ archive),
  **Attendance** (manual and face-recognition capture), **Results**,
  **Fees**, **Send Message** (WhatsApp templates), **Online Test**
  (scheduled papers, answer-sheet upload, AI recheck/analysis),
  **Accounts** (staff logins, roles, courses/subjects).

Users are non-technical teachers, often on phones and tablets in a classroom,
and admins on desktops. **Simplicity is a hard requirement.**

## Stack

| Layer | What |
|---|---|
| Framework | Next.js **14.2** App Router, React 18, TypeScript |
| Styling | Tailwind 3 + shadcn/ui (`components.json`, style `default`, base `slate`), `tailwindcss-animate` |
| UI primitives | Radix (dialog, dropdown, popover, select, checkbox, collapsible, toast) |
| Icons | `lucide-react` (only icon set; plus custom WhatsApp icons in `icons/`) |
| Data fetching | axios instance `lib/api.ts` + **mixed**: SWR in some hooks, `useState/useEffect` in others |
| State | Zustand (`stores/`), React context for auth (`context/auth-context.tsx`) |
| Math rendering | `mathpix-markdown-it` (heavy; loaded via `provider/MathpixProvider.tsx`) |
| DB | MongoDB Atlas via Mongoose (`models/`, `lib/dbUtils.ts`) |
| Auth | JWT in cookie `jwt_token_admin` (`jose`), checked in `middleware.ts` and `lib/auth.ts#getAccount` |
| AI | Gemini (`lib/ai/*`) — variants, recheck, diagram prompts, answer-sheet analysis |
| Images | Direct-to-provider signed uploads, Cloudinary or S3 (`lib/storage`, `/api/uploads/sign`) |
| Face attendance | Python functions `api/embed.py`, `api/recognize.py` (Vercel) and/or `recognition/` service (YuNet + SFace) |
| Hosting | Vercel (`vercel.json` sets durations/memory for heavy routes) |
| Toasts | Sonner (`sonnar-toaster.tsx`); `use-toast` is a compatibility shim over it |

## Commands

```bash
npm run dev     # next dev on port 3001
npm run build
npm run lint
```

No test suite exists. Verify UI changes by running the app and checking the
page at phone (≈375px), tablet (≈768/1024px) and desktop (≥1280px) widths.

Env vars (in `.env`, never committed): `DB_USER`, `DB_PASSWORD`,
`AUTH_SECRET`, `NEXT_PUBLIC_BASE_PATH` (must be the relative `/api`, see
BUGS.md #4), `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RECHECK_MODEL`,
`IMAGE_STORAGE`, `IMAGE_STORAGE_FOLDER` (+ provider keys),
`FACE_SERVICE_URL`, `FACE_SERVICE_SECRET`.

## Layout of the code

```
app/
  layout.tsx                 root html, Lato font, toasters, top progress bar
  signin/                    login page
  (root)/layout.tsx          server: getAccount() → redirect to /signin; Header; AuthProvider
  (root)/page.tsx            home = grid of route tiles
  (root)/(mathpix)/...       paper & question pages that need math rendering
  (root)/<feature>/page.tsx  one folder per feature (all client components)
  api/<resource>/route.ts    REST-ish route handlers (GET/POST/PUT/PATCH/DELETE)
components/
  ui/                        shadcn primitives + app-level widgets
  sheets/                    side sheets / dialogs, one per task (add-*, edit-*, view-*)
  frames/                    print layouts for papers
  wrapper/page-wrapper.tsx   page header + loading/empty/error states
modules/                     big page bodies (create-paper, generate-paper, manage-question)
hooks/                       one data hook per resource (useBatches, usePapers, ...)
service/                     thin axios wrappers (core.service, auth.service, test.service)
lib/                         server + shared utils (auth, db, httpCache, ai, storage, paperGen)
models/                      Mongoose schemas + exported TS types (TBatch, TPaper, ...)
data/routes.tsx              the nav list (label, href, icon, adminOnly) — single source for menu + home
data/const.ts                courses, subjects, marks, message templates
stores/                      zustand stores
recognition/, api/*.py       face-recognition service (Python)
```

### Conventions already in the code

- Route handlers call `await dbConnect()` then use Mongoose with `.lean()`
  for reads. Responses use `nextSuccess` / `nextError` (`lib/nextUtils.ts`)
  in newer routes; older ones build `NextResponse.json` by hand. Client axios
  interceptor reads `error.response.data.error` for the message.
- Read endpoints that are hit repeatedly use `jsonRevalidated`
  (`lib/httpCache.ts`) → ETag + 304. Reuse it for new list endpoints.
- List endpoints paginate with `page` / `limit` query params and return
  `totalPages` + `total*`.
- Navigation is driven by `ROUTES` in `data/routes.tsx`; `adminOnly` routes
  are filtered by `useRoutes()` which also redirects unknown paths to `/`.
- Role check: `Role.ADMIN` from `data/const.ts` via `useAuth()`.
- Long lists use the `.defer-offscreen` class (`content-visibility: auto`) —
  see the comment in `app/globals.css` for why it is not used in previews.
- Comments explain *why* (often with measured numbers). Keep that style.
- Known bugs and decisions live in `BUGS.md`. Read it before touching auth or
  attendance. Some items are "Won't fix (decided)" — do not "fix" them.

## UI/UX revamp — ground rules

The revamp goes **page by page**. Specs live in `docs/revamp/`:

- `docs/revamp/README.md` — index, order of pages, status table
- `docs/revamp/01-…06-*.md` — research-backed principles, design system,
  app shell, component patterns, performance plan, page checklist (read before any UI work)
- `docs/revamp/pages/<page>.md` — per-page plan, written when that page starts

Rules for every revamp change:

1. **Do not change core functionality.** Same features, same data, same API
   contracts unless a page spec explicitly says otherwise. A teacher must be
   able to do everything they did before, in the same or fewer steps.
2. **Simple first.** One primary action per screen, plain words, no new
   settings or modes. If a pattern adds learning cost, don't use it.
3. **Mobile, tablet, desktop are all first-class.** Design mobile first,
   then add density/shortcuts for desktop. Touch targets ≥ 44px. No hover-only
   affordances.
4. **Use the design system, not one-off classes.** Colors via CSS tokens in
   `app/globals.css`, components from `components/ui`. Replace ad-hoc
   `bg-slate-300` headers, `bg-gray-100` etc. with tokens as pages are touched.
5. **Icons:** `lucide-react` only, consistent size (16px inline, 20px nav,
   24px feature), `strokeWidth` 2 (1.5 for large empty-state art).
6. **Motion:** short (150–250ms), purposeful, and always disabled under
   `prefers-reduced-motion`. Animate `transform`/`opacity` only.
7. **Every async view has four states:** loading (skeleton, not spinner, for
   content areas), empty (illustration + one action), error (message + retry),
   data. Use/extend `PageWrapper`.
8. **Accessibility:** keyboard reachable, visible focus ring, labels on
   icon-only buttons, color contrast ≥ 4.5:1 for text.
9. **Print output must not change** (components/frames, `react-to-print`,
   `@page`, `print:hidden`). Verify printing after touching any paper page.
10. Keep `"use client"` boundaries as low as practical; prefer server
    components for static shells when a page is rewritten.

### Shared revamp components — use these, don't re-create them

Reuse when it fits without bending the component; small one-off repeats are fine.

- `Button variant="brand"` / `buttonVariants({ variant: "brand" })` — the one
  primary action on a screen (wrap links with `cn(buttonVariants(...), ...)`).
- `components/ui/page-header.tsx` `PageHeader` — icon tile + h1 + description + actions.
- `components/ui/state-message.tsx` `EmptyState`, `ErrorState` (`onRetry` or `retryHref`).
- `components/ui/responsive-list.tsx` `ResponsiveList` — table (md+) / cards (phone)
  from a column config + `renderCard`. Prefer it over `DataTable` on revamped pages.
- `components/ui/responsive-drawer.tsx` `ResponsiveDrawer` — every task panel:
  bottom drawer on phones, floating right panel on wider screens.
- `components/ui/document-window.tsx` `DocumentWindow` — reading a document (paper,
  preview): full screen on phones, large centred window on desktop, header
  shrinks on scroll. Tasks/forms use `ResponsiveDrawer` instead.
- `components/ui/date-time-picker.tsx` `DateTimePicker` (+ `calendar.tsx`) —
  never native date inputs; value format matches `datetime-local`.
- `components/ui/paper-status-badge.tsx` `PaperStatusBadge`.
- `components/ui/preview-button-v2.tsx` — the paper preview/print window
  (the old `preview-button.tsx` is gone).
- `ROUTE_GROUPS[group].tile` for section colours; `routeForPath`, `routesFor`
  in `data/routes.tsx` for anything route-aware.

## Performance — known opportunities (backend + frontend)

Check these when working on a page; fix the ones the page touches.

Backend (done: cached connection, indexes, parallel list queries, lean
reads, 304s for books/chapters, batch counts limited to listed batches)
- `dbConnect` caches one connection promise on `globalThis`; keep it that way.
- Indexes are declared in the schemas (`Schema.index` before `model()`), built
  by Mongoose's autoIndex. Add new ones there, matched to a real query.
- Region: Vercel functions (project setting) and the Atlas cluster are both in
  Mumbai. Keep new services there too.
- `getAccount()` is cached per request with React `cache` (one read per render).

Frontend
- Data hooks use SWR (shared cache + dedupe). List hooks use `LIST_SWR` and
  `swrLoading` from `lib/swr.ts`; keys are `["users", batchId]`-style arrays
  or endpoint-prefixed strings. `useExamResult` stays imperative (fetch on
  demand). Mutation-only hooks (generate, analyze) are plain state.
- Cache invalidation is central: every successful non-GET request through
  `lib/api.ts` calls `invalidateAfterWrite(url)`, which re-fetches the lists
  that write affects (`WRITE_EFFECTS` in `lib/swr.ts`). Add a row there for a
  new write endpoint; don't hand-wire refreshes across pages.
- Toasts: Sonner only. `components/ui/use-toast.ts` is a thin shim keeping the
  old `toast({ title, description, variant })` call; new code may import
  `toast` from "sonner". (`@radix-ui/react-toast` is still in package.json,
  unused; removing it reshuffles the lockfile, so it was left.)
- Math (`mathpix-markdown-it`, ~1.2 MB gzipped) loads only where math renders:
  `MathpixProvider` is mounted in `(root)/(mathpix)/layout.tsx` only (early
  download for paper/question pages); `<Markdown>` loads the library on demand
  elsewhere and injects the math styles itself. Never mount it in the shell.
- Monitoring: Vercel Web Analytics + Speed Insights (`<Analytics />`,
  `<SpeedInsights />` in `app/layout.tsx`), free tier, enabled per project in
  the Vercel dashboard. Server logs/errors: Vercel's Logs and Observability tabs.
  Packages are managed with **yarn**: `yarn.lock` is the only lockfile (the
  stale `package-lock.json` was removed). Add dependencies with `yarn add`,
  never `npm install <pkg>` (it would create a second lockfile).
- `lucide-react` is already in Next's default `optimizePackageImports` list,
  so named imports are fine. Measure the bundle (`@next/bundle-analyzer`)
  before adding config; `mathpix-markdown-it` is the likely heavyweight.
- **Background jobs** (`lib/jobs`): anything that can run past a function's
  time limit (bulk re-mark, imports, bulk sends, exports) is a job type, not a
  long request. Add a handler (`count` / `next(cursor)` / `run(key)` /
  optional `finish`) to `lib/jobs/registry.ts`; the engine runs it in ~20 s
  slices chained server-side, with a lock, stale-heartbeat restart, skip after
  3 stalls, capped failure list and cancel. UI: `useJob(type)` +
  `<JobProgress>`. Runs must be safe to repeat (an item may run twice).
- Use `next/dynamic` for heavy sheets (face capture, variants, markdown
  editor) so they don't ship in the page's first bundle.
- Prefetch with `<Link>` (already used) and add `loading.tsx` skeletons per
  route segment for instant navigation feedback.

## Working rules

- **Ask the user before any database change**: a new model/collection, a new
  field on a schema, a new index, or anything that stores more data. Explain
  the size impact first. (Already in place, with the user's knowledge since:
  `Question.stats` from lib/questionStats.ts, and the schema indexes listed
  under Performance; the `jobs` collection (models/Job.ts), approved without
  extra indexes; `SchedulePaper.students`, the optional chosen-students list,
  no new index; the `airequests` collection (models/AiRequest.ts), no extra
  indexes, deleted once uploaded or after 30 days unreviewed.)
- **AI requests** (`/ai-requests`, `lib/aiRequests.ts`): staff queue work for
  the nightly Claude run (`.claude/skills/generate-variants`, scripts in
  `scripts/ai-runner/`). The runner authenticates with `AI_RUNNER_KEY` on
  `/api/ai-runner/*`; only drafts verified by an independent solve are
  accepted. Caps: 500 drafts and 50 Workers AI images per 24 h.

- Branch for this effort: **`dev-revamp`** (cut from `main`; the Vercel dev
  domain tracks it). Commit there directly.
- **Push sparingly**: every push is a Vercel deployment. Commit locally as
  you go and push once per finished page (or when the user asks).
- Small, page-scoped commits. Message style: `feat:`, `fix:`, `perf:`,
  `refactor:`, `docs:` + short imperative summary (see `git log`).
- Do not commit `.env*`, credentials, or face models.
- Don't add a new UI library without a reason written in the page spec.
  Allowed additions already planned in the docs: `motion` (Framer Motion) for
  layout/presence animation, `vaul` for mobile bottom-sheet drawers, `cmdk`
  for the desktop command palette. Each must be justified on first use.

## Token budget for page revamps

Keep each page cheap:
- Spec in `docs/revamp/pages/` ≤ ~30 lines: contract list, target, out of scope.
  No new web research; 01–06 already cover it.
- Read only the page and the components it imports. No repo-wide sweeps.
- One `tsc` + one `next build` at the end (not before/after builds per step).
- Desktop users are mostly on Windows laptops: also check 1366x650. Use the
  `short:` screen (max-height 800px) for density, e.g. `md:short:`.
- Visual check: one phone (390) + one desktop (1280) viewport screenshot, not
  full-page; look again only if layout changed. Reuse the scratchpad helpers
  (`dev.sh on|start|stop|off` for the fixture account, `shot.js <path> <name>`)
  instead of writing new test scripts.
- Delegate codebase searches, screenshots and test runs to a subagent on the
  cheaper model (`model: "haiku"`; `Explore` for searches, `general-purpose`
  for running `dev.sh`/`shot.js`/build). Ask it for a short report (paths,
  pass/fail, overflow numbers), not file dumps. Keep design and code edits in
  the main session.
- Keep checks fast: no `next build` inside each check — one build before
  pushing a page. Small checks: run a short script yourself with exact
  selectors. When delegating, give the subagent the exact selectors (e.g.
  `getByRole('combobox', { name: 'Batch' })` — SelectCompact is named by its
  label) so it doesn't burn minutes on retries.
- Don't re-verify what already passed or run side experiments unless asked.
- Short commit messages. Chat replies: a few lines — what changed, anything to check. No tables or long recaps.
