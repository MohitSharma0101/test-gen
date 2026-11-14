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
| Toasts | **Two systems**: Radix toast (`components/ui/toast*`, `use-toast`) and Sonner (`sonnar-toaster.tsx`) |

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

## Performance — known opportunities (backend + frontend)

Check these when working on a page; fix the ones the page touches.

Backend
- `lib/dbUtils.ts#dbConnect` calls `mongoose.connect` every request with no
  cached promise. Cache the connection on `globalThis` (standard serverless
  pattern) so warm lambdas skip the handshake.
- **No indexes** on the hot query fields (only `AnswerSheet` has one).
  Candidates: `Question {chapter, createdAt}`, `Question.tags`, `Question.mark`,
  `Paper {author, createdAt}`, `Paper {course, status}`, `User.batchIds`,
  `Attendance {batch, date}` (non-unique — see BUGS.md #2), `Chapter.book`,
  `Fees`/`ExamResult` by user/batch. Verify with `explain()` before adding.
- List endpoints run `find` and `countDocuments` sequentially — run them with
  `Promise.all`.
- `getAccount()` hits the DB on every page render in `(root)/layout.tsx`;
  consider trusting verified JWT claims for the shell and loading the full
  account only where needed (or cache per request with React `cache`).
- `/api/batches?withCount=true` unwinds **all** users on every call; restrict
  with `$match` on the returned batch ids.
- Use projections (`.select`) everywhere a list doesn't need full documents
  (papers list already does this — follow that example).
- Add `jsonRevalidated` to remaining read-heavy GETs.
- Vercel functions default to `iad1` (US East). Users are in India; check the
  Atlas cluster region and pin functions to the matching/closest region
  (`"regions"` in `vercel.json`, e.g. `bom1` for Atlas `ap-south-1`). Every
  request makes several DB round trips, so this is likely the single biggest
  backend latency win.

Frontend
- Data fetching is split between SWR and hand-rolled `useEffect` hooks
  (e.g. `useBatches`). Move hooks to SWR for dedupe, cache, and optimistic
  updates via `mutate`.
- `MathpixProvider` is mounted in both `(root)/layout.tsx` and
  `(root)/(mathpix)/layout.tsx`; load it once, only where math renders.
- Two toast libraries are bundled; standardise on Sonner.
- `lucide-react` is already in Next's default `optimizePackageImports` list,
  so named imports are fine. Measure the bundle (`@next/bundle-analyzer`)
  before adding config; `mathpix-markdown-it` is the likely heavyweight.
- Use `next/dynamic` for heavy sheets (face capture, variants, markdown
  editor) so they don't ship in the page's first bundle.
- Prefetch with `<Link>` (already used) and add `loading.tsx` skeletons per
  route segment for instant navigation feedback.

## Working rules

- Branch for this effort: `claude/app-uiux-revamp-planning-pm7yck`.
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
- Visual check: one phone (390) + one desktop (1280) viewport screenshot, not
  full-page; look again only if layout changed. Reuse the scratchpad helpers
  (`dev.sh on|start|stop|off` for the fixture account, `shot.js <path> <name>`)
  instead of writing new test scripts.
- Delegate codebase searches, screenshots and test runs to a subagent on the
  cheaper model (`model: "haiku"`; `Explore` for searches, `general-purpose`
  for running `dev.sh`/`shot.js`/build). Ask it for a short report (paths,
  pass/fail, overflow numbers), not file dumps. Keep design and code edits in
  the main session.
- Don't re-verify what already passed or run side experiments unless asked.
- Short commit messages. Chat replies: a few lines — what changed, anything to check. No tables or long recaps.
