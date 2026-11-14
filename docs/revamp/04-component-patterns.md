# 04 · Component patterns

Reusable building blocks. Build them once in `components/ui` during the
Foundation step, then each page uses them. Names are proposals.

## 1. View states — `PageWrapper` v2

Every async area renders exactly one of: `loading`, `empty`, `error`,
`no-results`, `data`. `PageWrapper` already models this; upgrade it:

| State | Today | Target |
|---|---|---|
| loading | centered spinner | **skeleton of the real layout** (rows/cards), shown after ~300 ms; spinner only inside buttons and for short unknown waits |
| empty (nothing exists yet) | "Nothing Selected!" + pointer icon | `EmptyState`: icon tile or illustration, title, one sentence why, **one primary action** ("Add your first batch") [1] |
| no-results (filters hide everything) | "No Data found." | "No papers match these filters" + **Clear filters** button |
| nothing selected | "Nothing Selected!" | instruction: "Pick a batch to see attendance" + the picker itself if possible |
| error | red "Unable to Load." | `ErrorState`: plain message, **Retry** button, details collapsed |

Skeletons: same height as final content to avoid layout shift (CLS);
shimmer respects reduced motion by becoming a static tint.

## 2. Lists & tables — `ListView`

Today: `DataTable` (desktop-style table everywhere) and hand-built card
lists. Tables with 5+ columns overflow on phones.

Pattern: **one data definition, two renderings.** [2]

- ≥ 768 px: table with sticky header, `tabular-nums` number columns,
  right-aligned numbers, row hover, row click opens detail, actions at row
  end in a `⋯` menu (primary action may be a visible button).
- < 768 px: **card per row** — title line (name/title), 1–2 meta lines,
  status badge, chevron or primary action. Sorting becomes a "Sort" select
  at the top (Filament pattern).
- Column config gets `priority: 1 | 2 | 3` and `mobile: 'title' | 'meta' |
  'badge' | 'hidden'`.
- If a phone table really needs a grid (attendance, results entry), use
  horizontal scroll with a **sticky first column** and a visible scroll
  hint.
- Long lists: keep `.defer-offscreen`; paginate server-side as today, or use
  "Load more" on phones instead of numbered pagination.
- Selection/bulk: checkbox column on desktop; long-press or a "Select"
  toggle on mobile that turns the action area into a bulk-action bar.

## 3. Search, filter, sort

- Search input at the top of every list (debounced 250 ms, `/` focuses on
  desktop). Store query + filters in the **URL search params** (the app
  already uses `?page=&limit=`), so back/refresh/share keep state.
- Desktop: filters inline as compact selects/chips in one row.
- Phone: one "Filters" button with a count badge → bottom sheet with the same
  controls and "Apply" / "Clear". Active filters show as removable chips.
- Common selectors used across pages (course → subject → book → chapter,
  batch, author) become shared components with remembered last choice
  (`localStorage`) so teachers don't re-pick the same batch every visit.

## 4. Sheets, dialogs, drawers — `ResponsiveSheet`

The app is built around side sheets (`components/sheets/*`, ~20 of them).
Keep the model; make it adaptive:

- Desktop/tablet ≥ 768 px: right side sheet (current) at 480–640 px, or a
  centered dialog for short confirmations.
- Phone: **bottom drawer** (shadcn `Drawer`, built on `vaul`) with drag
  handle, swipe-down to close, max-height 90 vh, scrollable body, **sticky
  footer** with the primary action. [3]
- One wrapper switches by `useIsNarrowViewport` (already exists).
- Header: title + optional description + close. Footer: secondary (left /
  "Cancel"), primary (right, full-width on phone).
- Unsaved changes → confirm on close (reuse `confirmation.store`).
- Heavy sheets (face attendance, enroll face, variants, markdown editor,
  question analyzer) load with `next/dynamic` on open.

## 5. Forms

[4]
- Single column; labels **above** fields; helper text below; errors inline
  under the field in `--destructive` with an icon, plus focus the first
  invalid field on submit.
- 16 px input text on phones (prevents iOS zoom), 44 px tall inputs.
- Correct keyboards: `inputMode="numeric"` for marks/fees/roll no,
  `type="tel"` for phone, `autoComplete` for name/phone, `enterKeyHint`.
- Sensible defaults (today's date, last used batch/course).
- Primary button text states the outcome ("Save batch"), shows a spinner
  while pending, is disabled only while pending — not to hint validation.
- Use native date/time inputs on mobile.

## 6. Feedback & toasts

- Standardise on **Sonner** (remove Radix toast + `use-toast` once all
  callers move). Position: bottom-center on phone (above bottom nav),
  bottom-right on desktop.
- Success toasts are short ("Batch archived") and offer **Undo** for
  reversible actions (archive, remove from batch) instead of a confirm
  dialog.
- Destructive, irreversible actions (delete paper/question/batch) keep a
  confirm dialog that names the item and uses a red primary button.
- Errors: toast for background actions; inline for forms.
- Long-running AI/face jobs: in-sheet progress with stage text; if the user
  closes the sheet, a persistent toast with progress.

## 7. Buttons & actions

- Variants: primary (filled brand), secondary (outline), ghost, destructive,
  link. One primary per view.
- Sizes: `sm` 36 px (desktop dense), `default` 40 px, `lg` 48 px (mobile
  primary). Touch target ≥ 44 px via padding even if visual is smaller.
- Icon + label by default; icon-only needs `aria-label` + tooltip.
- Pressed state: `active:scale-[0.98]` 100 ms.
- Async: label → spinner (same width, no jump) → brief check → label.

## 8. Badges & status

`StatusBadge` with fixed meanings across the app: success (Present, Paid,
Published), warning (Pending, Review, Draft), destructive (Absent, Overdue),
neutral (Archived). Always icon + text.

## 9. Command palette

See 03. Built on shadcn `Command` (`cmdk`) in a Dialog; items come from
`ROUTES` plus recent entities.

## 10. Charts (results, fees, attendance trends — if/when added)

Only where they answer a real question ("Which students fell below 40 %?").
Prefer a number + small sparkline over a full chart on phones. Follow the
`dataviz` guidance when building one; always offer the table view.

## Sources

1. NN/g — [Designing Empty States in Complex Applications](https://www.nngroup.com/articles/empty-state-interface-design/)
2. [Responsive data table patterns](https://dev.to/logrocket/improving-responsive-data-table-ux-with-css-2ngi); Filament — [Table layout on mobile](https://filamentphp.com/docs/5.x/tables/layout); [Ramotion: mobile tables](https://www.ramotion.com/blog/mobile-tables-design/)
3. shadcn/ui — [Drawer (Vaul) & responsive dialog](https://ui.shadcn.com/docs/components/radix/drawer); [Credenza](https://21st.dev/redpangilinan/credenza)
4. Baymard — [Mobile checkout](https://baymard.com/research-articles/mobile-checkout); web.dev — [Form best practices](https://web.dev/payment-and-address-form-best-practices/)
