# 06 · Page checklist, order & inventory

## Step 0 — Foundation (before any page)

Shared pieces every page will use. Ship as small PRs; no page should look
different yet except where a primitive is swapped in place.

- [ ] Tokens in `app/globals.css` + `tailwind.config.ts` (02): `--brand*`
      already added (sign-in); point `--primary`/`--ring` at brand; darken
      `--destructive` to red-600 (current text fails 4.5:1); success/warning/info (+ `-soft`), motion durations/easings.
- [ ] `data/icons.ts` — one icon per concept; `ROUTES` uses it; add
      `group` + `mobilePriority` to `ROUTES`.
- [ ] `PageHeader`, `EmptyState`, `ErrorState`, `StatusBadge`,
      skeleton presets (list rows, cards, table).
- [ ] `PageWrapper` v2 using the above (04 §1).
- [ ] `ResponsiveSheet` (side sheet ≥ 768 px, `vaul` drawer below) (04 §4).
- [ ] `ListView` (table ≥ 768 px, cards below) (04 §2).
- [ ] Sonner as the only toaster; migrate `use-toast` callers.
- [ ] Reduced-motion utilities; `LazyMotion` provider (only if `motion` is
      added).
- [ ] Backend: cached `dbConnect`, function region, indexes, `Promise.all`
      for list+count (05 B1–B4).
- [ ] `useReportWebVitals` reporter + `Server-Timing` on list routes.
- [ ] Bundle-analyzer baseline recorded in `pages/_baseline.md`.

## Step 1 — App shell + Home (03)

Sidebar / rail / bottom bar, top bar, `PageHeader`, Today home, command
palette (desktop), `MathpixProvider` only in `(mathpix)` group,
`getAccount` caching.

## Page order

Ordered by daily use and pain. Adjust after asking teachers.

| # | Page | Route | Users | Why this position |
|---|---|---|---|---|
| 1 | Attendance | `/attendance` | all | daily, phone, classroom; face capture flow |
| 2 | Create Paper | `/create-paper` | all | core job; complex desktop layout, poor on phone |
| 3 | Generate Paper | `/generate-paper` | all | core job; 800-line module, many controls |
| 4 | Papers (+ edit) | `/papers`, `/papers/edit/[id]` | all | find/print/merge; list-detail candidate |
| 5 | Send Message | `/send-message` | all | daily; WhatsApp flow |
| 6 | Results | `/exam-results` | all | entry form + view sheet |
| 7 | Online Test | `/online-test` | all | schedule, answer sheets, AI recheck |
| 8 | Users | `/users` | admin | table → card list on phone |
| 9 | Batches (+ archive) | `/batch`, `/batch/archive` | admin | simple; quick win |
| 10 | Fees | `/fees` | admin | table, status colors |
| 11 | Questions | `/questions` | admin | question bank, bulk actions |
| 12 | Upload Paper | `/upload` | admin | Mathpix upload flow |
| 13 | Chapters | `/chapters` | admin | reorder/move |
| 14 | Books | `/books` | admin | simple |
| 15 | Accounts | `/accounts` | admin | simple table |
| 16 | Sign in | `/signin` | all | first impression; illustration, brand |

Quick wins (Batches, Books, Sign in) can be pulled earlier to prove the
foundation. **Sign in was done first** (see `pages/16-signin.md`).

## Per-page workflow

1. Copy the template below to `pages/<nn>-<page>.md`.
2. Fill **Current state** by reading the code and using the page at phone,
   tablet and desktop widths. List every feature/action — this list is the
   contract that nothing gets lost.
3. Write **Target** using 01–05. Get sign-off on anything that moves an
   action or changes a flow.
4. Record **Before** numbers (bundle size, requests, API time, Lighthouse).
5. Build. Small commits.
6. Run the **Definition of done** checklist; record **After** numbers.
7. Update the status table in `README.md`.

### Template

```md
# <Page name> (`/route`)

## Current state
- Purpose / who uses it / device
- Features & actions (complete list — the "don't lose anything" contract)
- APIs called (endpoint, method, payload size, time)
- Problems (UX, visual, perf), with screenshots if useful

## Target
- Layout per breakpoint (phone / tablet / desktop)
- Primary action; secondary actions; where each lives
- States: loading / empty / no-results / error
- Icons, illustration (if any), motion moments
- Desktop extras (shortcuts, palette commands)
- Backend changes (indexes, projection, caching) — no contract changes

## Out of scope

## Numbers
| | Before | After |
|---|---|---|
| First-load JS | | |
| Requests on load | | |
| Main API p75 (warm) | | |
| Lighthouse mobile perf | | |

## Done checklist
(copy from 06)
```

## Definition of done (every page)

Functionality
- [ ] Every item in "Features & actions" still works (tick each).
- [ ] No API contract change (or documented + approved).
- [ ] Print output unchanged (paper pages).

Layout
- [ ] 360, 390, 768, 1024, 1280, 1536 px checked; no horizontal page
      scroll; nothing cut off.
- [ ] Primary action reachable with the thumb on phone (sticky bar / FAB).
- [ ] Tables become cards (or sticky-first-column scroll) on phone.
- [ ] Safe-area padding on bottom bars.

Visual
- [ ] Only design tokens; no raw `slate-*`/`gray-*`/`sky-*` color classes.
- [ ] Icons from `data/icons.ts`; consistent sizes.
- [ ] `PageHeader` used; title is an `<h1>`.

States & feedback
- [ ] Loading skeleton matches layout (no CLS), empty / no-results / error
      states designed with an action.
- [ ] Every action gives feedback < 100 ms; success toast; Undo where
      reversible; confirm only for irreversible deletes.

Motion
- [ ] Only transform/opacity; ≤ 300 ms; reduced-motion respected.

Accessibility
- [ ] Keyboard-only run-through; visible focus; Esc closes overlays.
- [ ] Icon-only buttons have `aria-label`; inputs have labels.
- [ ] Contrast ≥ 4.5:1; status not color-only; targets ≥ 44 px on touch.

Performance
- [ ] Numbers table filled; no regression > 20 % in first-load JS.
- [ ] Heavy sheets dynamically imported; data via SWR.
- [ ] Touched API routes: lean/select, Promise.all, index verified with
      `explain()`.

## Inventory — what we already know per page

First-pass notes from reading the code. Each page spec will expand these.

**Global**
- All nav is in a "Menu" dropdown; logo click reloads the page.
- Per-page header bars use `bg-slate-300`, different heights, some ALL CAPS
  (`BATCHES`).
- Spinners (`Loader2Icon`) for nearly all loading; `PageWrapper` exists but
  only Online Test uses it.
- Two toast systems in use (Radix `toast` in hooks, Sonner elsewhere).
- Content capped at 700 px in `PageWrapper` even on desktop.

**Home** — tile grid only; grey icon circles; no "today" info.

**Attendance** — batch select + date + roster; face-capture sheet
(`face-attendance-sheet.tsx`, 326 lines) and enroll sheet (401 lines) are
heavy and should be dynamically loaded; ideal place for optimistic
"present/absent" toggles and a satisfying "Saved" moment. Present/absent
must be icon + color + text.

**Create Paper / Generate Paper** — large modules (`modules/create-paper.tsx`
390 lines, `generate-paper.tsx` 828). Many selects (course → subject → book →
chapter, marks, tags, quotas). Desktop: two-pane (picker | live paper
preview, `react-resizable-panels` already installed). Phone: stepper
(1 Choose chapters → 2 Pick questions → 3 Review & save) with a sticky
"N questions · M marks" summary bar. Mathpix rendering cost: keep
`.defer-offscreen`.

**Papers** — `DataTable` + pagination + author/course filters; view, edit,
merge, schedule sheets. List-detail on desktop; cards + filter sheet on
phone.

**Send Message** — template select, batch, extra fields, preview; WhatsApp
buttons. Show the message preview as a chat bubble; per-student send list
with sent ticks.

**Results** — 17 sheet references; CSV template exists. Results entry grid
needs sticky first column on phone; view sheet can show a simple
distribution.

**Online Test** — uses `PageWrapper`; schedule paper, answer-sheet upload,
AI recheck/analyze. Long AI jobs need progress stages.

**Users** — `DataTable`; add/edit sheets; CSV template. Card list on phone
with call/WhatsApp quick actions (components already exist:
`call-button`, `wa-button`).

**Batches** — card list; `key={batch.name}` (should be `_id`); edit button
inside a clickable card (nested targets); delete commented out. Archive
page separate.

**Fees** — `DataTable`, batch select; paid/pending status colors and
`tabular-nums` amounts.

**Questions / Upload / Chapters / Books** — admin bank tools; bulk delete,
move chapter dialog, markdown editor. Desktop-first, but must remain usable
on tablet.

**Accounts** — simple table + edit sheet.

**Sign in** — plain card; generic "Something went wrong." on any error
(show "Wrong username or password" for 401). Add logo, brand color, a light
illustration, password show/hide, `autoComplete="username"` /
`"current-password"`.
