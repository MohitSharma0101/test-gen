# Sign in (`/signin`)

First page revamped (pulled ahead of the order in 06 as a quick win and to
introduce the brand tokens).

## Current state

- **Who / device:** every teacher and admin, any device; often the first
  screen of the installed PWA on a phone.
- **Files:** `app/signin/layout.tsx` (server: already signed in → redirect
  `/`), `app/signin/page.tsx` (client), `service/auth.service.ts`,
  `app/api/auth/login/route.ts`.
- **Features & actions (contract — all must keep working):**
  1. Enter username + password (both required).
  2. Submit with button or Enter.
  3. `POST /api/auth/login` → token saved in cookie `jwt_token_admin` →
     `router.refresh()` → layout redirects to `/`.
  4. Button disabled + "Logging in..." while pending.
  5. Error message on failure; button re-enabled.
  6. Signed-in users visiting `/signin` are redirected to `/`.
- **API:** `POST /api/auth/login` `{username, password}` → 200
  `{data:{token, account}}` · 400 missing fields · 404 "Account not found." ·
  401 "Invalid credentials." · 500.
- **Problems**
  - No logo, brand or name: looks like a generic template.
  - Any failure shows "Something went wrong.", even a wrong password, so
    users can't tell a typo from an outage.
  - Labels aren't linked to inputs (`<label>` without `htmlFor`) → tapping
    the label doesn't focus; screen readers don't announce them.
  - No `autoComplete` → password managers / iOS keychain fill poorly; mobile
    keyboard auto-capitalises the username.
  - No show-password toggle (typing passwords on phones is error-prone).
  - Input text 14 px → iOS zooms the page on focus.
  - Whole page is a client component; heading is an `<h2>`; page `<title>`
    is the app default.

## Target

**Phone (< 1024 px)**: soft brand-tinted background; logo + "Education+" +
tagline at the top; white card with the form; help line underneath. Content
centered, safe-area aware, works in landscape.

**Desktop (≥ 1024 px)**: split screen. Left: brand panel in `--brand` with
logo tile, a small inline-SVG illustration (question paper + checkmarks +
A+ badge, drawn in-house — no licence issues), a headline and three
icon+text lines naming what the app does (papers, attendance, results &
messages). Right: the same form.

**Form**
- `<h1>` "Welcome back" + "Sign in to continue to Education+".
- Username: leading `User` icon, `autoComplete="username"`,
  `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`,
  `enterKeyHint="next"`.
- Password: leading `Lock` icon, trailing show/hide button (`Eye`/`EyeOff`,
  `aria-label`, `aria-pressed`), `autoComplete="current-password"`,
  `enterKeyHint="go"`, **Caps Lock is on** hint.
- Inputs 48 px tall, 16 px text (no iOS zoom), labels linked with `htmlFor`.
- Primary button 48 px, brand color: "Sign in" → spinner + "Signing in…" →
  check + "Signed in" while the redirect happens.
- Errors (inline alert, `role="alert"`, icon + text, card shakes once):
  - 401/404 → "Wrong username or password." (same text for both, so the
    page doesn't reveal which usernames exist)
  - 400 → "Enter your username and password."
  - no response → "Can't reach the server. Check your internet connection."
  - other → server message or "Something went wrong. Please try again."
  - Editing a field clears the error; password field is focused and
    selected after a wrong-password error.
- Help line: "Forgot your password? Ask your admin to reset it." (admins
  already reset passwords from Accounts — no new feature).

**Motion:** card fades/slides up 300 ms on load; shake 400 ms on error;
both only under `motion-safe`. Spinner kept under reduced motion.

**Performance:** `page.tsx` becomes a server component (static brand panel,
illustration, metadata); only the form is a client component. Logo via
`next/image` with `priority`. No new dependencies.

**Small shared change:** the axios interceptor in `lib/api.ts` now attaches
the HTTP `status` to the rejected `Error` (message unchanged), so callers can
tell a 401 from a network failure. Additive; existing callers unaffected.

## Out of scope

- Cookie lifetime (1 h `maxAge`, users get signed out hourly) — note for the
  auth/perf step.
- Login API stays as is (404 vs 401 still leaks whether a username exists at
  the API level; the UI no longer shows it). `dbConnect` caching comes with
  Foundation.
- Dark mode.

## Numbers

| | Before | After |
|---|---|---|
| `/signin` page JS (next build) | 2.25 kB | 3.94 kB |
| `/signin` first-load JS | 128 kB | 135 kB (+5.5 %, within budget) |
| Lighthouse | not measured (no prod env here) | |

Growth is `next/image` + lucide icons in the client form; the brand panel
and illustration are server-rendered HTML/SVG.

## Done checklist

Verified with Playwright against `next dev`, login API mocked (no DB here).

- [x] Contract 1–5 work: required fields, Enter submits, cookie set on 200,
      `router.refresh()` called, pending state, errors re-enable the form
- [ ] Contract 6 (signed-in redirect) unchanged code; needs a real DB to run
- [x] 390, 820, 1440 px and 844×390 phone landscape; no horizontal scroll
- [x] Keyboard: Tab order username → password → show/hide → Sign in;
      Enter submits; focus returns to (selected) password after an error
- [x] Errors: 401 and 404 → "Wrong username or password.", network →
      "Can't reach the server…", 500 → server message; typing clears it
- [x] Reduced motion: no slide/shake (`animation-name: none`), spinner kept
- [~] Tokens: brand tokens used; `text-red-700` / `text-amber-700` used
      until `--destructive` / `--warning` are fixed in Foundation (current
      destructive text fails 4.5:1 on its tint). Illustration uses raw
      palette colors by design.
- [x] `next build` and lint pass
