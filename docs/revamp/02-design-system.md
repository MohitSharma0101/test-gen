# 02 · Design system

The app already uses shadcn/ui with CSS variables in `app/globals.css`, but
pages bypass them with raw Tailwind colors (`bg-slate-300` headers,
`bg-gray-100` body, `text-sky-500`, `bg-white`). The revamp makes the tokens
the only source of color, so the look is consistent and dark mode becomes
possible later for free.

## Brand

Logo: Education+ (`public/eplus-logo-min.png`, black "e" + a royal-blue
swoosh), tagline "Believe in Results". The brand color is the logo blue
**`#0053C5`** (`hsl(215 100% 39%)`, sampled from the PNG). White text on it
is ≈ 6.9:1, so it is safe for filled buttons. Today `--primary` is
near-black (shadcn default), which makes primary buttons look heavy and
unbranded.

Tokens added in the login-page step (`app/globals.css`):
`--brand` (215 100% 39%), `--brand-foreground` (white), `--brand-soft`
(215 100% 97%, tinted backgrounds). They exist as a separate name so pages
can adopt the brand one at a time; in the app-shell step `--primary` /
`--ring` are pointed at the brand and `brand` stays as an alias.

## Color tokens

Keep the shadcn variable names (components already use them) and add
semantic ones. HSL values to finalise in the Foundation step; check contrast
of every text/background pair (≥ 4.5:1) before merging.

| Token | Use | Light (proposal) |
|---|---|---|
| `--background` | app canvas | slate-50 `210 40% 98%` |
| `--card` | surfaces (cards, sheets, tables) | white |
| `--foreground` | body text | slate-900 |
| `--muted` / `--muted-foreground` | secondary surfaces / secondary text | slate-100 / slate-500 |
| `--primary` / `--primary-foreground` | the one main action, active nav, links | brand `215 100% 39%` / white |
| `--accent` | hover/selected row, subtle highlight | brand-soft `215 100% 97%` |
| `--border`, `--input`, `--ring` | lines, inputs, focus ring | slate-200, slate-200, brand |
| `--success` (new) | present, paid, saved | emerald-600 |
| `--warning` (new) | pending, partially paid, review needed | amber-500 (text amber-700) |
| `--destructive` | absent, overdue, delete | red-600 |
| `--info` (new) | neutral notices | blue-600 |

Each status color also gets a `-soft` background (e.g. `--success-soft`
emerald-50) for badges and row highlights. Rules:

- **Color carries meaning.** Bright color only for status and the primary
  action; everything else neutral. [1]
- Status is never color-only: badge = icon + text + color.
- Extend `tailwind.config.ts` with `success`, `warning`, `info` so classes
  read `bg-success-soft text-success`.

## Typography

- Keep **Lato** (already loaded via `next/font`), but load only the weights
  used: 400, 700 (drop 100/300 → fewer font bytes). Consider **Inter** only
  if tabular numbers matter more (fees, results); otherwise use
  `font-variant-numeric: tabular-nums` (`tabular-nums` class) on number
  columns.
- Scale (rem): 12 caption · 14 body-sm (tables, dense UI) · 16 body
  (mobile default; prevents iOS zoom on input focus) · 18 section title ·
  20/24 page title · 30 KPI number.
- Page titles are real `<h1>` in sentence case ("Attendance"), not
  ALL-CAPS strings like `BATCHES`.

## Spacing, radius, elevation

- 4 px grid. Common: 8 / 12 / 16 / 24 / 32. Page gutter 16 px phone,
  24 px tablet, 32 px desktop.
- Radius: keep `--radius: 0.5rem`; cards and sheets `rounded-xl` (12 px),
  inputs/buttons `rounded-md`, pills `rounded-full`.
- Elevation: three levels only — flat (border), raised (`shadow-sm`, cards),
  overlay (`shadow-lg`, popovers/sheets). No heavy shadows.

## Icons

- **lucide-react only** (already installed; ISC license; already tree-shaken
  by Next's default `optimizePackageImports`). [2]
- Sizes: 16 px inline with text, 20 px in nav and buttons, 24 px section /
  feature icons, 40–48 px inside empty-state "icon tiles".
- `strokeWidth={2}`; 1.5 for ≥ 40 px.
- **One icon per concept, app-wide.** Define them once in `data/icons.ts`
  (e.g. `Icons.attendance = CalendarCheck2`, `Icons.paper = FileText`,
  `Icons.ai = Sparkles`) and import from there. Today Attendance uses
  `Edit3Icon` (a pencil), which says "edit", not "attendance".
- Each nav destination gets a soft colored icon tile (icon in
  `--primary` on `--accent`, or a per-section hue) — this alone fixes most of
  the "lacks icons" feel of the home grid.

Suggested mapping (verify names against the installed lucide version):

| Route | Icon |
|---|---|
| Create Paper | `FilePen` |
| Generate Paper | `WandSparkles` |
| Upload Paper | `FileUp` |
| Papers | `Files` |
| Questions | `FileQuestion` |
| Chapters | `BookOpenText` |
| Books | `Library` |
| Users (students) | `Users` |
| Batches | `GraduationCap` |
| Attendance | `CalendarCheck2` |
| Send Message | `MessageCircle` (+ WhatsApp icon on the send button) |
| Results | `Trophy` or `ChartColumn` |
| Fees | `IndianRupee` / `Wallet` |
| Online Test | `Timer` / `MonitorCheck` |
| Accounts | `UserCog` |

## Illustrations

Where: empty states, first-run of a page, success (paper saved, attendance
submitted), error and 404, sign-in page. Nowhere else.

Style: flat, 2-tone, recolored to `--primary` so they match the brand.
Size: ≤ 160 px tall on phone, ≤ 220 px desktop. Ship as **inline SVG
components** (tree-shaken, themeable via `currentColor`), not PNG.

Sources and licences (verify before use; record the licence in the file
header):

- **Open Peeps** — CC0, public domain, commercial OK. [3]
- **unDraw** — free for commercial use under unDraw's *own* licence (not
  MIT); no redistribution as a pack, no AI training. Recolorable in the site
  before download. [4]
- Fallback that needs no art: a 64 px rounded tile with a 32 px lucide icon
  on `--accent` + title + one sentence + one button. Use this for most empty
  states; reserve full illustrations for the 4–6 most visible moments.

## Motion

Install `motion` (Framer Motion) **only** for layout/presence animation that
CSS can't do well (list item enter/exit, shared layout, drag-to-dismiss), and
load it with `LazyMotion` + `m` + `domAnimation` to keep the initial cost
≈6 kB instead of ≈34 kB. [5] Everything else is CSS via
`tailwindcss-animate` (already installed).

Tokens (add to `tailwind.config.ts` / CSS vars):

| Token | Duration | Easing | Use |
|---|---|---|---|
| `instant` | 100 ms | ease-out | press, toggle, checkbox |
| `fast` | 150 ms | ease-out | hover, tooltip in, fade |
| `base` | 200 ms | `cubic-bezier(.2,.8,.2,1)` | dialog/popover in, list item enter |
| `slow` | 300 ms | same | sheet/drawer slide, page section reveal |
| exit | ~70 % of enter | ease-in | anything leaving |

Rules [6]:
- Animate `transform` and `opacity` only (no width/height/top — causes
  layout and hurts INP).
- ≤ 300 ms for UI feedback; never block input while animating.
- `prefers-reduced-motion: reduce` → replace movement with a quick fade;
  **keep** spinners, progress bars and skeleton shimmer (they are feedback).
  Don't use the blunt `* { animation-duration: 0.01ms }` reset.
- Signature moments (use sparingly): checkmark draw on "Attendance saved",
  count-up on KPI numbers, stagger (30 ms) on first list paint, button →
  spinner → check on save.
- Page transitions: Next 14 has no stable view-transition support
  (experimental in 15+). Use a 150 ms fade/slide on the page content
  container plus the existing top progress bar; revisit when we upgrade. [7]

## Sources

1. Think.design — [Dashboard Design in 2026: Do's and Don'ts](https://think.design/?p=2597); UXmatters — [Real-time dashboard UX](https://www.uxmatters.com/mt/archives/2025/08/from-data-to-decisions-ux-best-practices-for-real-time-performance-dashboard-design.php)
2. Next.js — [optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports); Vercel — [How we optimized package imports](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)
3. [Open Peeps](https://www.lapa.ninja/freebies/openpeeps) (CC0)
4. [unDraw licence](https://undraw.co/license)
5. Motion — [Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size), [LazyMotion](https://motion.dev/motion/lazy-motion/)
6. [UMich design system: motion](https://design-system.lib.umich.edu/visual-elements/motion); [Motion grammar](https://blakecrosley.com/blog/motion-grammar-when-animation-earns-its-frames)
7. Next.js — [viewTransition (experimental)](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition); Chrome — [View Transition API](https://developer.chrome.com/docs/web-platform/view-transitions)
