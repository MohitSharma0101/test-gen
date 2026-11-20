---
name: generate-variants
description: Work the staff app's AI request queue - write question variants (similar to given questions, or on a topic), verify every answer with an independent solve, draw diagrams, run the format/render checks and upload drafts for staff review. Use for the nightly AI-request run, or when asked to process AI requests / generate variants for the question bank.
---

# Generate question variants (nightly AI requests)

Staff queue requests on the **AI requests** page (`/ai-requests`). This skill claims them, writes the questions, proves every answer, and uploads drafts that staff review before anything enters the bank. **Quality is not negotiable**: a draft that isn't independently verified is never uploaded.

## Setup (once per session)

- Work in this repo (`test-gen`). If `node_modules` is missing: `yarn install --frozen-lockfile`.
- The app's runner key and the Cloudflare token are injected by the network proxy (network secrets on the app host and `api.cloudflare.com`); scripts send placeholders. `AI_APP_URL` defaults to production. `CF_ACCOUNT_ID` must be set for AI images.
- Working files go in `/tmp/ai-runner/<requestId>/`. Never commit anything from a run.
- Run every script with `NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1` (export them once): Node's built-in fetch ignores the session proxy otherwise, so the app host doesn't resolve and the key isn't injected.

## Token rules

- **Don't explore the repo.** Everything you need is this file, `node scripts/ai-runner/format-rules.mjs` (print once, keep in context) and `request.json`.
- Mechanical work is scripts, not model work: `check.mjs` (format, render, duplicates), `render.mjs` (screenshots), `upload.mjs`, `finish.mjs`.
- Batch: up to 8 questions per subagent call. Subagents get only what they need (no rules dump, no request JSON).
- Only redo what failed. Never regenerate a whole batch for one bad item.
- Keep console output short: print summaries, write JSON to files.

## Models

| Work | Who |
|---|---|
| Planning, writing questions + solutions, drawing SVG diagrams, judging diagram correctness | You (the main session) |
| Independent solving (the answer check) | Subagent, `model: "sonnet"`: strong enough for JEE/NEET, never shown the key |
| Format-only fixes from `check.mjs` output; layout review of rendered PNGs (overlaps, cut-off labels, unreadable text) | Subagent, `model: "haiku"`: lower-grade work, cheap |

## The loop

1. `node scripts/ai-runner/next.mjs /tmp/ai-runner/cur` → prints `NONE …` (stop) or a summary; full data in `request.json` (`request`, `sources`, `chapter`, `existingStarts`, `caps`). Respect `caps.draftsLeft` and `caps.aiImagesLeft`.
2. **Plan** the batch (below), then **write** → **solve independently** → **check** → **diagrams** → **upload**, in batches of up to 8 questions.
3. When the request is done: `node scripts/ai-runner/finish.mjs <id>`. If the night's cap ran out mid-request: upload what is verified, then `finish.mjs <id> --requeue`.
4. Go back to step 1 until `NONE`.

### Plan

- **similar** (`input.mode`): for each source, `input.count` variants. Read the source and its answer; identify the exact concept tested and the common mistakes.
- **topic**: list the sub-concepts of `input.topic` within `chapter` first, spread the `input.count` questions across them, and mix easy/medium/hard around `input.difficulty`.
- `input.difficulty`: same / easier / harder relative to the source (or the usual JEE/NEET level for topic).
- `input.questionType`: `same` keeps the source's type; otherwise MCQ or NUMERICAL.
- `input.instructions` from staff take priority over everything here except the output format and quality bar.
- `alreadyMade` > 0 means an earlier run was interrupted: make only the remainder.

### Write (you)

Follow the house format exactly (from `format-rules.mjs`); it's the same as the app's variant generator. Per question produce:

```json
{ "id": "v1", "questionType": "MCQ", "mark": 4, "sourceQuestion": "<source _id or omit>",
  "text": "Stem…\n\n\\textbf{(a)} …\n\n\\textbf{(b)} …\n\n\\textbf{(c)} …\n\n\\textbf{(d)} …",
  "ans": "(c\\)\n\nStep-by-step solution ending with the final answer." }
```

- `ans` first line: MCQ `(x\)` (the escaped bracket stops "(c)" turning into ©); NUMERICAL the bare number. Then a blank line, then the solution. In the solution text write "option c", never "(c)" (becomes ©) or "(c\)" (shows the backslash).
- Split long display equations into several `$$…$$` lines: one line must fit a phone screen.
- `mark`: the source's mark (similar) or 4 (topic) unless instructions say otherwise.
- **Quality bar:**
  - The physics, chemistry or maths is correct, with realistic values and correct units.
  - **Exactly one** correct option, and the wrong options come from real student mistakes (sign error, missed factor, wrong formula).
  - Within the JEE/NEET and NCERT syllabus for the chapter.
  - Not a copy of the source with only numbers changed when a fresh context is easy; never a near-duplicate of `existingStarts`.
  - No "as shown in the figure" unless you attach that figure.
  - Write your own full solution while writing the question. If you can't solve it cleanly, don't keep it.

### Solve independently (the answer check, no exceptions)

- Spawn a `sonnet` subagent per batch with **only** the question texts (and each diagram as a rendered PNG path to look at). Never the answers or solutions. Ask for `[{ "id", "answer" }]`, where answer is the option letter or the number, plus one line of working.
- Compare with your key. MCQ: same letter. NUMERICAL: equal after rounding to the precision the question asks for (or 2 significant figures if unspecified).
- **Mismatch:** re-derive yourself. If your key was wrong, fix the key and solution; if the question was ambiguous, fix the wording. Then solve again with a **fresh** solver. At most 2 repair rounds; if it still doesn't agree, **drop the question** and write a new one in its place.
- Only questions where the independent solve matches get `"checks": { "keyMatch": true }`.

### Check (script, then haiku for format fixes)

- Write the batch to `/tmp/ai-runner/<id>/batch-N.json` and run `node scripts/ai-runner/check.mjs batch-N.json request.json`.
- `fail` lines: give **only** the failing drafts plus the check output to a `haiku` subagent: "Fix formatting only. Don't change meaning, numbers or the answer." Re-run the check.
- Near-duplicates: replace the question (write a new one, solve it again).
- If a fix changed any maths, numbers or the answer, it goes back through the independent solve.
- Passing drafts get `"renderOk": true`.

### Diagrams

- Decide per question. Add a figure when a student would otherwise have to sketch it to understand the setup: several bodies or surfaces placed relative to each other, circuits, geometry with angles or positions, graphs, ray paths. Skip it when one short clause says it all ("a charge at the centre of a cube"). Never add one just for decoration.
- Don't overdo it: every figure is an image on the app's Cloudinary free plan. Aim for roughly 1 question in 4 at most, and keep SVGs small (no embedded fonts or bitmaps unless it's an AI image).
- **Draw it yourself as SVG** (default): `/tmp/ai-runner/<id>/d-<qid>.svg`.
  - `viewBox` around 520×260, black strokes 2–3 px, white background, no colours (papers print in black and white).
  - Labels in serif italic (`font-family="Times New Roman, serif" font-style="italic"`), 20–26 px. Plain symbols and Unicode sub/superscripts (v₀, θ, R₁), no LaTeX.
  - Arrowheads via `<marker>`. Keep it uncluttered. **Never label the quantity being asked for.**
  - Put `![](d-<qid>.svg)` in `text` after the stem and before the options. `upload.mjs` uploads it and swaps in the URL.
- **Demanding drawings** (biology structures, anatomy, detailed apparatus) that SVG can't do well: `node scripts/ai-runner/ai-image.mjs "<what to draw>" d-<qid>.png`. It's unlabelled by design. Then write an SVG that embeds the PNG (`<image href="data:image/png;base64,…">`) and adds the labels and leader lines on top. Set `"diagramKind": "ai-image"`. Stay within `caps.aiImagesLeft`; when it's 0, reword the question to need no figure, or drop it.
- **Look at every diagram:**
  1. `node scripts/ai-runner/render.mjs batch-N.json out/`.
  2. A `haiku` subagent reviews all PNGs for layout problems only (overlapping or cut-off labels, unreadable text) and lists them.
  3. **You** check each diagram's correctness against the question's numbers and setup.
  4. Fix and re-render until clean.

### Upload

- `node scripts/ai-runner/upload.mjs <requestId> batch-N.json`. Each item needs `checks: { keyMatch: true, renderOk: true, notes? }`. The server rejects anything else, and enforces the 200-a-night draft cap and the 50-a-night AI image cap.
- Never upload a draft whose final key wasn't confirmed by the independent solve.

## End of run

Print a short summary: per request, how many were made, dropped (and why, in one line), and the final status.
