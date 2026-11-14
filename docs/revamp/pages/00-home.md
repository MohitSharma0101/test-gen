# Home (`/`)

## Current state

- **Who / device:** everyone, every session; first screen after sign-in.
- **Files:** `app/(root)/page.tsx` (client), `data/routes.tsx`,
  `hooks/useRoutes.ts`.
- **Features & actions (contract):**
  1. A tile for every page the account may open (`ROUTES`, admin-only
     tiles hidden for teachers), each linking to its page.
  2. Same list and order as the header "Menu".
- **Problems**
  - A flat grid of 9–15 identical grey tiles: nothing says what to do
    first, nothing is grouped, no descriptions for non-technical users.
  - Icons sit in grey circles; Attendance uses a pencil (`Edit3`), which
    reads as "edit".
  - No information: the page never shows the user's own work.
  - Whole page is a client component that only renders static links.
  - `useRoutes()` (in the header) calls `router.replace("/")` whenever the
    path matches no route, and `/` matches none. Measured: Next 14 does not
    refetch on a replace to the same URL, so this costs nothing today; a
    guard was added anyway so the intent is explicit.
  - `getAccount()` (JWT verify + DB read) runs in the layout; any page that
    also needs the account would read it again.

## Target

Simple "start here" page — no charts, nothing to configure.

1. **Greeting**: "Good morning, Manoj" + today's date, computed on the
   server in `Asia/Kolkata` (the institute's time zone) so it is right on
   first paint, no flicker.
2. **Jump back in** — the **last 4 pages this person opened**, newest
   first (product decision, replaces a fixed set of quick actions).
   - Recorded by `components/visit-tracker.tsx` (mounted in the signed-in
     layout) on every navigation; sub-pages count as their parent
     (`/papers/edit/x` → Papers, `/batch/archive` → Batches). Home itself
     isn't recorded.
   - Stored in a `recent_pages` cookie (paths only, per device, 1 year) so
     the server renders the right buttons on first paint — no swap after
     hydration. A tiny client component re-reads the cookie on mount to
     cover Next's client router cache (coming straight back to Home within
     ~30 s).
   - Filtered by role on render (a teacher never gets an admin-only page,
     even from a shared device's cookie).
   - Until there are 4, the row is topped up with defaults (Create paper,
     Generate paper, Take attendance, Send message). Heading reads
     "Quick actions" with no history, "Jump back in" once there is some.
   - The newest is the brand-filled button. Buttons are server-rendered and
     only reordered on the client, so no icons or route data ship as JS.
3. **Recent papers** — the 4 newest papers (admin: all authors; teacher:
   their own, same rule as `usePapers`/`useAuthors`; teachers who aren't a
   known author don't get the section, as on the Papers page). Each row:
   title, question count, status, "3 days ago", opens
   `/papers/edit/[id]`; "All papers" link. Loading → skeleton (streamed
   with `<Suspense>`, the rest of the page doesn't wait); empty → "No
   papers yet" + Create paper; error → message + Try again.
4. **All tools** — every route, grouped (Daily · Papers · Question bank ·
   Institute) with a colored icon tile per group and a one-line
   description. 1 column on small phones, 2 from 400 px, 3 on desktop.

Layout: phone stacks greeting → quick actions → recent papers → tools.
Desktop (≥ 1024 px): tools take two thirds, recent papers sit in a right
column.

**Motion:** sections fade/slide up with a 40 ms stagger on first paint;
tiles lift 2 px with a shadow on hover and press down on tap; arrow nudges
on hover. All `motion-safe`.

**Performance**
- `page.tsx` becomes a server component; the only client JS added is none —
  links and the recent-papers list are server-rendered HTML.
- Recent papers are read straight from MongoDB in a server component
  (`select` 5 fields, `lean`, `limit 4`) — no client fetch, no API hop.
- `getAccount` wrapped in React `cache()` so layout + page share one JWT
  verify and one DB read per request (05 §B5 option 1).
- Skip the no-op self-redirect in `useRoutes` for `/`.

**Shared changes:** `ROUTES` gets `group` and `description`; clearer
icons (Attendance `CalendarCheck2`, Papers `Files`, Books `Library`,
Results `Trophy`, Online Test `Timer`, Accounts `UserCog`). The header menu
picks these up too (same list, same order).

## Out of scope

- Header / navigation (sidebar, bottom bar) — App shell step.
- Attendance / fees / online-test "today" cards: their APIs need a batch id
  per call; add once a cheap summary endpoint exists.
- Page background still `bg-gray-100` from the root layout (shell step).

## Numbers

| | Before | After |
|---|---|---|
| `/` page JS | 5.57 kB | 870 B |
| `/` first-load JS | 128 kB | 98.1 kB (−23 %) |
| Client fetches for Home content | 0 (static links) | 0 (recent papers read on the server) |
| `/` first-load JS with Jump back in | — | 98.7 kB (first client version was 114 kB; moved rendering to the server) |
| Account DB reads per request | 1 (layout) | 1 (layout + page share via `cache()`) |

## Done checklist

Verified with Playwright against `next dev`. No database is reachable from
this environment, so `getAccount` and the papers query were temporarily
patched with fixtures (headers chose role/name/state) and restored before
commit.

- [x] Every route reachable; link counts: admin 24 (4 quick + 15 tools + 5
      papers), teacher-author 16, teacher non-author 11 (no papers section)
- [x] 360 / 390 / 820 / 1280 / 1440 px: body width == viewport. A long paper
      title widened the grid column on phones (grid items default to
      `min-width:auto`); fixed with `min-w-0` on the columns.
- [x] Recent papers: loading skeleton (streams in), empty, error, data
- [x] Keyboard: header → quick actions → All papers → papers → tools,
      visible brand focus ring
- [x] Reduced motion: all reveals/hover moves are `motion-safe`
- [x] `next build` passes; no new lint warnings
- [x] Jump back in: new device → defaults; visits recorded newest-first,
      capped at 4, re-visit moves to front, correct after browser Back,
      admin-only pages dropped for a teacher with the same cookie
- [ ] Real data check on staging: greeting name, author filter, paper links
