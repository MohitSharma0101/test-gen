---
name: check-answer-sheets
description: Mark offline answer sheets queued on the staff app's AI requests page ("Check answer sheets") - read each student's scanned pages, mark every question against one marking scheme, flag doubtful answers, and upload the results for teacher review. Use in the nightly AI-request run, or when asked to check / mark answer sheets.
---

# Check answer sheets (nightly AI requests, type "check")

A teacher uploaded one answer sheet (page images) per student and picked the paper. You mark every question for every student, flag anything doubtful, and upload. **The teacher reviews and publishes**; nothing reaches students until then. Fair, consistent marking matters more than speed.

## Setup (once per session)

- Work in the `test-gen` repo. If `node_modules` is missing: `yarn install --frozen-lockfile`.
- `export NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1`. `AI_APP_URL` defaults to production. The runner key is injected by the network proxy; never look for it.
- Working files: `/tmp/ai-runner/check/`. Never commit anything from a run.

## Token rules

- Don't explore the repo. Everything is in this file, `paper.md` and `request.json`.
- Page images are the cost (~1.5k tokens a page). Readers look at each page once; you look again only at crops of flagged answers.
- Keep console output short; write JSON to files.

## Models

| Work | Who |
|---|---|
| Marking scheme, marking every answer, notes, judging flagged answers (with crops) | You (the main session) |
| Reading: transcribing what each student wrote, per question | Two independent subagents, `model: "sonnet"`, up to 5 students each |

## The loop

1. `node scripts/ai-runner/check-next.mjs /tmp/ai-runner/check` → `NONE …` (stop) or a summary. It writes `request.json`, `paper.md` and the pages under `pages/<nn>-<name>/p<k>.jpg`. If `pagesFailed` > 0, stop and report (the pages host may be blocked).
2. **Marking scheme** (once per request; reuse `request.rubric` if the summary says one is saved).
3. **Read** → **compare** → **mark**, in batches of up to 5 students.
4. **Upload** each batch with `check-upload.mjs`, so an interrupted run keeps its work (the next claim skips students already done).
5. `node scripts/ai-runner/finish.mjs <id>` when every sheet is uploaded. If `caps.sheetsLeft` runs out: upload what is done, then `finish.mjs <id> --requeue`.
6. Back to step 1 until `NONE`.

### Marking scheme (you)

Read `paper.md` once. For every question write `points`: how its marks are earned, in one short paragraph.
- **Objective** (MCQ, true/false, one-word, numerical answer): all or nothing. Negative marking only if `test.instructions` says so.
- **Written** (short answer, derivation, proof): split the marks into steps, e.g. "1: correct statement; 1: contradiction set up; 1: conclusion". Say what earns half marks.
- Accept any correct method, not only the bank's solution. Note common acceptable variants.
- `test.instructions` from the teacher override these defaults.
- If the bank has no solution for a question, solve it yourself first and base the scheme on that.

Save as `rubric.json`: `[{ "question": "<id>", "points": "..." }]`. The same scheme marks every student.

### Read (two sonnet subagents, independently)

Give each reader only: the question list (number, marks and the question text from `paper.md`, **no solutions**) and the page image paths of up to 5 students. Ask for, per student and per question:
`{ "student": "<id>", "answers": [{ "n": 1, "page": 0, "wrote": "<what is written, short; key steps for long answers>", "clear": true }] }`
- Transcribe, don't judge. Copy maths as written (wrong steps too). "" if not attempted.
- Answers can be out of order or continued on another page; search all pages.
- `clear: false` when the handwriting or a step can't be read with confidence.

Run the two readers in parallel, then compare per question. **Flag** an answer when the readers disagree on anything that affects marks, or either says `clear: false`. For each flagged answer, crop the region yourself and look:
`python3 -I scripts/ai-runner/crop.py <page.jpg> <x0> <y0> <x1> <y1> /tmp/ai-runner/check/crop.jpg` (fractions of the page; `--rotate 90` for sideways scans). If you can now read it with confidence, unflag it; otherwise keep the flag for the teacher.

### Mark (you)

For each student and every question of the paper:
- `marks` by the scheme (quarter steps at most; never above the question's marks).
- `answer`: what they wrote, short (≤ 200 chars).
- When marks were lost: `mistakeType`, one of `concept` (doesn't know the idea), `method` (wrong approach, e.g. checking examples instead of proving), `calculation` (slip in arithmetic or algebra), `incomplete` (stopped part-way or skipped the justification), `misread` (answered a different question), `not_attempted` (blank; 0 marks); and a `note`: one or two sentences saying where and why marks were cut, in the language of `test.language` (`hinglish`: Hindi in Latin script mixed with English, as Indian teachers write; `hindi`: Devanagari; `english`). Plain text, no markdown, no LaTeX.
- Full marks: no `mistakeType`, no `note`.
- `flagged: true` where reading stayed doubtful, or the marks depend on a judgement the teacher should make. `page`: 0-based page index where the answer is.
- Be consistent: the same answer gets the same marks for every student.

Write the batch as `results-N.json`: `{ "rubric": [...] (first batch only), "sheets": [{ "student": "<id>", "answers": [{ "question": "<id>", "answer", "marks", "mistakeType", "note", "flagged", "page" }] }] }` (question ids from `paper.md`, every question present).

### Upload

`node scripts/ai-runner/check-upload.mjs <requestId> results-N.json`. The server checks that every question is marked and within its marks; fix and re-post on an error (re-posting a student replaces their sheet).

## End of run

Short summary per request: sheets marked, answers flagged, anything skipped and why, final status.
