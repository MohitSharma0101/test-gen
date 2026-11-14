# 01 · Design principles

Every revamp decision is checked against these. When two conflict, the
earlier one wins.

## Who we design for

- **Teachers** — on a phone or tablet, often standing in a classroom, one
  hand busy, short on time. Main jobs: take attendance, make/print a paper,
  send a message to parents, enter results.
- **Admins** — on a desktop, doing longer sessions: question bank, chapters,
  books, users, batches, fees, accounts. They benefit from density and
  keyboard speed.

Both are non-technical. Neither wants to learn a new tool.

## 1. Simple beats clever

- **One primary action per screen**, visually dominant (filled button).
  Everything else is secondary (outline/ghost) or in an overflow menu.
- **Plain words.** "Take attendance", not "Capture". "Save paper", not
  "Persist". Labels say what happens.
- **Don't add modes, settings or toggles** to solve layout problems.
- **Progressive disclosure**: show what 80% of users need; put rarer options
  behind "More options" / an overflow menu, never remove them.
- **Same thing looks the same everywhere** (same icon, word, color, place).
  Consistency is the cheapest way to make an app feel easy.

## 2. Visible beats hidden

NN/g's hidden-navigation study (179 users, 6 sites) found hiding the main
navigation behind a hamburger cut discoverability almost in half and increased
task time and perceived difficulty, on desktop and mobile; their 2025 update
says the icon is more recognised now but the interaction cost remains. [1][2]

So:
- The most used destinations are **always visible** (sidebar on desktop,
  rail on tablet, bottom bar on phone — see 03). "More" holds the rest.
- Actions are **buttons with labels**, not icon-only, unless the icon is
  universal (close, search, back) — and then they get an `aria-label` and a
  tooltip on desktop.
- No hover-only affordances. Touch users can't hover.

## 3. Fast feels easy

NN/g response-time limits: **0.1 s** feels instant, **1 s** keeps the flow of
thought, **10 s** is the limit of attention; beyond 10 s show percent-done and
a way to cancel. [3]

- Every tap gives feedback within 100 ms (pressed state, button spinner,
  optimistic update).
- Content areas show a **skeleton** of the real layout when the load is
  expected to take > ~300 ms; nothing for shorter waits (avoid flashes).
  Evidence is mixed — Viget's test found a skeleton did *not* beat a spinner,
  so skeletons must match the real layout closely and appear only for
  real waits. [4]
- Long jobs (AI variants, face recognition, paper generation, answer-sheet
  analysis) show **stage text + progress** ("Detecting faces… 3 of 28") and a
  Cancel where possible.
- Optimistic UI for safe, reversible actions (mark present, archive, toggle)
  with rollback on error. [5]

## 4. Mobile first, desktop power

- Layout is designed at 360–390 px first, then expanded.
- Desktop gets **more density and shortcuts**, not different features:
  wider tables, side-by-side list-detail, keyboard shortcuts, a command
  palette (⌘K / Ctrl K).
- Material 3 window classes give us the breakpoints and pane counts:
  compact < 600, medium 600–839, expanded ≥ 840 (large ≥ 1200). One pane on
  compact/medium, two on expanded (list-detail). [6]
- Restructure for mobile, don't just shrink: collapse tables to cards,
  move filters into a sheet, sticky primary action at the bottom within thumb
  reach. [7]

## 5. Delight that earns its place

The app currently lacks icons, illustrations and motion. Add them so they
**explain**, not decorate:

- Icons next to every nav item, primary action and section title (aids
  scanning).
- Illustrations only in empty states, first-run, success moments and errors
  (see 02). Never in the working area of a busy screen.
- Motion explains change: where a sheet came from, what was added/removed,
  what is loading. Short (100–300 ms), `transform`/`opacity` only, and
  reduced under `prefers-reduced-motion` (feedback like spinners stays). [8]

## 6. Accessible by default

- WCAG 2.2 AA: text contrast ≥ 4.5:1, target size ≥ 24 px (2.5.8). We use
  **44 px** for touch targets, matching Apple HIG and WCAG AAA 2.5.5. [9]
- Visible focus ring on everything interactive; full keyboard operation.
- Color never the only signal (present/absent uses icon + color + text).
- Form labels above fields; placeholders are hints, not labels. [10]

## 7. Don't break what works

- Printing (paper frames, MCQ key, teacher copy) must be pixel-identical
  unless a spec says otherwise.
- API contracts stay. Backend changes are for speed and must be invisible
  to the UI except for being faster.
- Each page is shipped and verified on its own; no big-bang rewrite.

## Sources

1. NN/g — [Hamburger Menus and Hidden Navigation Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/)
2. NN/g — [The Hamburger-Menu Icon Today: Is it Recognizable?](https://www.nngroup.com/articles/hamburger-menu-icon-recognizability/), [Beyond the Hamburger (mobile)](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)
3. NN/g — [Response Time Limits](https://www.nngroup.com/articles/response-times-3-important-limits/), [Powers of 10](https://www.nngroup.com/articles/powers-of-10-time-scales-in-ux/)
4. Viget — [A Bone to Pick with Skeleton Screens](https://viget.com/articles/a-bone-to-pick-with-skeleton-screens)
5. SWR — [Mutation & Revalidation (optimisticData, rollbackOnError)](https://swr.vercel.app/docs/mutation)
6. Android — [Canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts), [Adaptive layout codelab](https://developer.android.com/codelabs/adaptive-material-guidance)
7. Smashing — [UX Strategies for Real-Time Dashboards](https://smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/); FusionCharts — [Dashboard design best practices](https://www.fusioncharts.com/blog/dashboard-design-best-practices/)
8. Motion durations & reduced motion — [UMich design system: motion](https://design-system.lib.umich.edu/visual-elements/motion), [Animating with restraint](https://grayson-portfolio.pages.dev/blog/2025-12-24-animating-with-restraint)
9. WCAG 2.2 — [2.5.8 Target Size (Minimum)](https://tabnav.com/academy/wcag/success-criterion-2.5.8), [Deque axe target-size](https://dequeuniversity.com/rules/axe/4.8/target-size)
10. Baymard — [Mobile checkout research (labels above fields)](https://baymard.com/research-articles/mobile-checkout); Smashing — [UX and HTML5 mobile forms](https://www.smashingmagazine.com/2018/08/ux-html5-mobile-form-part-1/)
