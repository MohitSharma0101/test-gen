# Bug list

Severity: **High** = security or data loss · **Medium** = wrong behaviour in a
real case · **Low** = latent / needs specific conditions.

| # | Severity | Area | Summary | Status |
|---|---|---|---|---|
| 1 | High | `middleware.ts` | Requests with no token pass through instead of being rejected | Open |
| 2 | Medium | `models/Attendance.ts` | No unique index on `{batch, date}`; duplicate docs possible | Won't fix (decided) |
| 3 | Low | `models/Attendance.ts` | `date` is a String with unverified format | Open |
| 4 | Medium | `.env` / `lib/api.ts` | `NEXT_PUBLIC_BASE_PATH` was absolute localhost, broke all API calls off-machine | Fixed 2026-10-25 |
| 5 | — | Face enrollment | No parental-consent record for biometric data of minors | Won't fix (decided) |

---

## 1. Middleware lets tokenless API requests through — High

`middleware.ts` matches `/api/:path*` and comments say "protect all API
routes", but:

```ts
if (!token) {
  return null;   // Next treats null as "continue"
}
```

Returning `null` means *proceed*. Only an **invalid** token gets a 401; a
**missing** token is allowed past. Any API route that does not call
`getAccount()` itself is reachable unauthenticated.

- Routes that guard themselves are fine (e.g. `app/api/face/enroll/route.ts`).
- Unaudited: every other route under `app/api/`.

Fix: `return NextResponse.json({...}, { status: 401 })` in the no-token branch.
Then audit which routes relied on the gap.

## 2. No unique index on Attendance {batch, date} — Medium, won't fix

Two documents can exist for one batch and date. `app/api/attendance/route.ts`
GET does `Attendance.find(...)` then takes `attendance?.[0]`, so one of them
becomes invisible and a teacher's edits can appear to vanish.

User decided against the index (teachers must be able to update attendance —
note the index would not have blocked updates, only duplicate documents).
Recorded here so the failure mode is known if it ever shows up.

## 3. Attendance.date is a String — Low

Format not traced through all callers. If it is ever not `YYYY-MM-DD`,
attendance and capture lookups silently return nothing rather than erroring.

## 4. NEXT_PUBLIC_BASE_PATH was absolute localhost — Medium, fixed

Was `http://localhost:3001/api`. `NEXT_PUBLIC_*` is inlined into the client
bundle, so every browser on another device called *its own* localhost. Presented
as a CORS error in devtools.

Fixed by changing it to `/api`, which resolves against the serving origin and
works on localhost, LAN IP, tunnels and production. Original backed up as
`.env.bak`. Verified `localhost:3001` no longer appears in `.next/static`.
