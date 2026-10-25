# Open items — recognition service

> **Superseded by `api/` (Vercel Python functions).** This folder still works
> for local development (`uvicorn main:app`), but the logic now lives twice:
> here and in `api/_face.py`. Delete this folder once the Vercel deployment is
> verified end to end, or the two will drift.


Paused mid-way. Nothing in this folder has been executed, so treat all of it as
a first draft until the Docker build runs.

## Unverified

- [ ] **`main.py` has never been parsed.** No Python on the dev machine, so a
      typo would only surface on first build.
- [ ] **Model download URLs untested.** Using the GitHub LFS media endpoint.
      If the paths moved, the build fails at the `test` size assertions in the
      Dockerfile — fallback mirror is noted in README.md.
- [ ] **OpenCV calls untested**: `FaceDetectorYN.create`, `setInputSize`,
      `detect`, `alignCrop`, `feature`, `match`. API believed correct, never run.
- [ ] **Docker build never run.** Image size unknown — the estimate was
      400–600 MB, which matters for staying inside Artifact Registry's free
      0.5 GB.
- [ ] **Cold start time unmeasured.** Assumed 10–30s, fine because nothing
      waits on the result.

## Needs real data before it can be right

- [ ] **Thresholds are guesses.** `AUTO_THRESHOLD = 0.45`,
      `REVIEW_THRESHOLD = 0.30`, either side of OpenCV's documented 0.363
      same-identity boundary for SFace. Set these from the score distribution
      after shadow mode, not from these defaults.
- [ ] **`MIN_FACE_WIDTH = 50`** is a guess too. Depends on how teachers frame
      their photos.
- [ ] **Log every score during shadow mode**, not just the decisions, or there
      is nothing to tune from.

## Decisions deferred

- [ ] **Auth between Next.js and Cloud Run.** Deployed with
      `--no-allow-unauthenticated`, so the caller needs a Google identity
      token. Shared-secret header is simpler for the POC; IAM is correct for
      production. Not implemented either way yet.
- [ ] **Where the service runs for the POC** — Cloud Run, or local container
      behind `cloudflared tunnel`. Tunnel is free and has no RAM limit.
- [ ] **Artifact Registry cleanup policy** (keep last 3 images) not set.
- [ ] **Budget alert at ₹100/month** not set. Cloud Run has no hard cap.

## Known app-side gaps, deliberately left

- **No unique index on `Attendance { batch, date }`** — user decided against
  it. Consequence: if two documents ever exist for one batch and date, the
  GET handler takes `attendance?.[0]` and the other document's edits become
  invisible.
- **`Attendance.date` is a String** and the format was not traced through all
  callers. If it is ever not `YYYY-MM-DD`, capture lookups will silently miss.

## Note for the schema

SFace signatures are **128 floats**, not 512. (512 is ArcFace/InsightFace.)
`FaceSignature.vector` should be sized accordingly.
