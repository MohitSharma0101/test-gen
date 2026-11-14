# 03 · App shell, navigation & home dashboard

## Today

- `components/ui/header.tsx`: logo + account menu + a **"Menu" dropdown**
  holding all 15 routes. All navigation is hidden behind one button on every
  screen size.
- Home (`app/(root)/page.tsx`): a 2/3-column grid of route tiles with a
  grey icon circle. No information, no shortcuts to today's work.
- Each page draws its own header bar (`bg-slate-300`, sometimes ALL-CAPS
  text) — inconsistent heights and styles.
- Content width is capped at 700 px by `PageWrapper` even on wide screens.

## Target: one adaptive shell

Breakpoints follow Material 3 window classes [1] mapped onto Tailwind:

| Class | Width | Tailwind | Navigation | Panes |
|---|---|---|---|---|
| Compact (phone) | < 600 | default | **Bottom bar**: 4 most used + "More" | 1 |
| Medium (tablet portrait) | 600–1023 | `sm`/`md` | **Navigation rail** (72 px, icon + short label) | 1 (2 for list-detail on landscape) |
| Expanded (tablet landscape, laptop) | ≥ 1024 | `lg` | **Sidebar** 240 px, collapsible to rail | 2 (list-detail) |
| Large | ≥ 1280 | `xl` | Sidebar | 2–3 |

Why visible navigation: hidden menus roughly halve discoverability (NN/g,
see 01). A bottom bar puts destinations in thumb reach for one-handed use. [2]

### Navigation content

Driven by `ROUTES` in `data/routes.tsx` (keep it the single source). Add two
fields: `group` and `mobilePriority`.

Groups (sidebar section headings):

1. **Daily** — Home, Attendance, Send Message, Results, Online Test
2. **Papers** — Create Paper, Generate Paper, Papers
3. **Question bank** (admin) — Questions, Upload Paper, Chapters, Books
4. **Institute** (admin) — Users, Batches, Fees, Accounts

Bottom bar on phones (max 5 slots): **Home · Attendance · Create Paper ·
Papers · More**. "More" opens a bottom sheet with the remaining routes as a
grouped icon grid (same as the home tiles). Final choice of the 4 items
should come from usage; this is the default.

Role filtering stays in `useRoutes()`.

### Top bar

- Phone: page title (left), one contextual action or search (right),
  account avatar. Back arrow on sub-pages (`/batch/archive`,
  `/papers/edit/[id]`).
- Desktop: breadcrumb/page title, global search button showing
  `Ctrl K` hint, account menu. Logo lives in the sidebar.
- Clicking the logo goes to `/` (today it reloads the page — surprising).

### Page header (replaces per-page `bg-slate-300` bars)

One `PageHeader` component: icon tile + `<h1>` + optional subtitle/count +
actions slot. On phone the primary action moves to a sticky bottom action
bar or a FAB above the bottom nav; secondary actions go into a `⋯` menu.

### Content width

- Forms and reading views: max 720 px, centered.
- Lists/tables: full width up to 1280 px.
- List-detail (Papers, Questions, Users, Batches): list 360–420 px +
  detail pane on ≥ 1024 px; on smaller screens the detail opens as a
  full-height sheet (what the app already does with side sheets). [1]

### Safe areas & PWA

The app ships a manifest and `apple-mobile-web-app-capable`; when installed
it runs full-screen. Use `env(safe-area-inset-bottom)` padding for the bottom
bar and sticky action bars; set `viewport-fit=cover`; set `theme-color` to
the brand color.

## Home → a simple "Today" dashboard

Keep it simple: the home page answers *"what do I do now?"* in one glance,
then gives shortcuts. No charts that need interpreting. [3][4]

Layout (phone stacks top to bottom; desktop uses a 12-col grid):

1. **Greeting + date** — "Good morning, Priya · Thu 14 Nov".
2. **Quick actions** (3–4 big buttons, icon + label): Take attendance,
   Create paper, Send message, (admin) Add student.
3. **Today cards** (only data we already have via existing APIs; each card
   links to the page):
   - Attendance: batches marked today vs total ("3 of 5 batches marked").
   - Online tests: upcoming/scheduled papers.
   - Recent papers: last 3 by this author, with Open / Print.
   - (admin) Fees: count of pending fees.
4. **All tools** — the existing tile grid, grouped like the sidebar, with
   colored icon tiles.

Rules:
- KPI cards show one number, one label, one link. Number uses
  `tabular-nums` and a brief count-up on first load.
- Each card loads independently (own skeleton, own error with retry) so one
  slow API doesn't block the page. With server components each card can be
  its own `<Suspense>` boundary.
- If a card needs a new/heavier API, it is out of scope for the shell step;
  ship the tile grid + quick actions first, add cards when the API is cheap.
- Role-based: teachers don't see admin cards. [3]

## Desktop productivity layer

All optional; nothing here is required to use the app.

- **Command palette** (`Ctrl/⌘ K`) using `cmdk` inside the existing Radix
  Dialog (shadcn `Command`): jump to any page, recent papers, batches,
  students; actions like "Take attendance for …". Opens < 100 ms, input
  focused, shows shortcuts next to items to teach them. [5]
- **Shortcuts**: `/` focus search, `n` new (page's primary action), `Esc`
  close sheet, `g` then a letter to go to a page. Show them in the palette
  and in tooltips; provide a `?` cheat sheet.
- Sidebar collapse state remembered in `localStorage`.
- Tables get sticky headers, keyboard row navigation, multi-select with
  Shift-click where bulk actions already exist (questions delete, etc.).

## Sources

1. Android — [Canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts), [Large screens](https://developer.android.com/design/ui/large-screens)
2. Smashing — [Bottom Navigation Pattern on Mobile Web Pages](https://smashingmagazine.com/2019/08/bottom-navigation-pattern-mobile-web-pages); NN/g — [Hamburger menus](https://www.nngroup.com/articles/hamburger-menus/)
3. Alphonso Labs — [SaaS dashboard UX requirements 2026](https://www.alphonsolabs.com/saas-dashboard-ux-requirements-2026/amp/); DesignRush — [Dashboard design principles 2026](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-design-principles)
4. Browser London — [Best dashboard designs 2026](https://www.browserlondon.com/blog/2026/03/18/best-dashboard-designs-every-product-team-should-look-at-in-2026/); NN/g — [Empty states in complex applications](https://www.nngroup.com/articles/empty-state-interface-design/)
5. [Command palette pattern](https://outdraw-academy.gitbook.io/ux-patterns/command-palette); [Chameleon: Cmd+K search](https://chameleon.io/patterns/cmd-k-search)
