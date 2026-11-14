# UI/UX Revamp

Goal: make Education+ Test Gen **visually appealing, fast, and very easy to
use** on phone, tablet and desktop, without changing what the app does.

Constraints (from the product owner):

- Core functionality stays the same. No feature removed, no new modes.
- Keep everything simple. The current app is simple; the revamp must not
  trade that away for "power".
- Add what is missing today: icons, illustrations, animation, smooth
  transitions, clear feedback.
- Optimise speed, frontend **and** backend APIs.
- Work happens **page by page**. Each page gets its own spec in `pages/`
  before code is written.

## Documents

| # | File | What it is for |
|---|---|---|
| 01 | [Design principles](01-design-principles.md) | The rules every decision is checked against, with the research behind them |
| 02 | [Design system](02-design-system.md) | Color tokens, type, spacing, radius, elevation, icons, illustrations, motion |
| 03 | [App shell & navigation](03-app-shell-navigation.md) | Responsive layout for phone / tablet / desktop, nav, home dashboard |
| 04 | [Component patterns](04-component-patterns.md) | Lists & tables, forms, sheets/drawers, states, feedback, search & filters, command palette |
| 05 | [Performance plan](05-performance.md) | Frontend + backend speed work, budgets, how to measure |
| 06 | [Page checklist & inventory](06-page-checklist.md) | Definition of done per page, page order, current issues per page |
| — | [`pages/`](pages/) | One spec per page, written when that page is started (template in 06) |

## Order of work

0. **Foundation** (no visible page change yet): tokens, motion utilities,
   `EmptyState` / `ErrorState` / skeletons, responsive `ResponsiveSheet`,
   `ListView` (table on desktop, cards on mobile), DB connection cache,
   indexes, function region. See 06 for the exact list.
1. **App shell** — header, sidebar / rail / bottom nav, home dashboard.
2. Pages in the order listed in [06](06-page-checklist.md#page-order)
   (highest daily use first: Attendance, Create/Generate Paper, Papers, …).

## Status

| Area | Spec | Built | Verified (phone/tablet/desktop/print) |
|---|---|---|---|
| Foundation | 02–05 | ☐ | ☐ |
| App shell + Home | 03 | ☐ | ☐ |
| Sign in | [pages/16-signin.md](pages/16-signin.md) | ☑ | ☑ (phone/tablet/desktop; signed-in redirect needs real DB) |
| Other pages | see 06 | | |

Update this table in the same commit that finishes a step.
