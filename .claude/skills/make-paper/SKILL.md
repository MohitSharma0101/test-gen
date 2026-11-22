---
name: make-paper
description: Make question papers queued on the staff app's AI requests page ("Make a paper") - read the teacher's prompt, plan the paper on the exam's pattern (JEE Main, NEET, CBSE, RBSE or the prompt's own), then either write every question new (verified like variants, the default) or pick questions from the bank (least used first), for the teacher to preview and save. Use in the nightly AI-request run, or when asked to make/generate a paper from the question bank.
---

# Make a paper (nightly AI requests, type "paper")

A teacher wrote a prompt, a name, the course and the subjects, and chose where questions come from (`request.input.source`):
- **`write`** (default): you **write every question new**, prove each answer, place each in the best-fitting chapter, and upload them as drafts. Nothing enters the bank until the teacher previews and saves the paper. Follow **Write new** below.
- **`bank`** (or missing): you **pick existing questions** and save a **Draft paper**. Follow **Search, shortlist, choose** and **Save**. You never write new questions in this mode.

## Setup (once per session)

- Work in the `test-gen` repo. If `node_modules` is missing: `yarn install --frozen-lockfile`.
- `export NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1`. `AI_APP_URL` defaults to production. The runner key is injected by the network proxy; never look for it.
- Working files: `/tmp/ai-runner/paper/`. Never commit anything from a run.

## Token rules

- Don't explore the repo. Everything is in this file, `request.json` and `chapters.txt`.
- Choose from cheap facts first (`paper-search.mjs`: chapter, marks, tags, times used, start of the text). Read full text (`paper-full.mjs`) only for the shortlist, at most ~3x the questions needed, and only where the start of the text isn't enough to judge topic and type.
- No near-duplicate search across the bank: prefer the **least-used** questions (the search already sorts by times used). Within this paper, don't pick two questions whose starts are obviously the same question.

## The loop

1. `node scripts/ai-runner/paper-next.mjs /tmp/ai-runner/paper` → `NONE …` (stop) or a summary; the bank map is in `chapters.txt` (one line per chapter: id, subject, book, chapter, total, numericals, marks spread).
2. **Blueprint** (below). Then for `bank`: **search** → **shortlist** → **choose** → **order** → **save** with `paper-save.mjs <id> paper.json`. For `write`: **Write new** (below), ending with the note.
3. `node scripts/ai-runner/finish.mjs <id>`. If nothing usable could be made: `finish.mjs <id>` with no paper saved fails the request; say why in the summary.
4. Back to step 1 until `NONE`.

### Blueprint (you)

Turn the prompt into a plan, per subject: how many questions of which type and marks, from which chapters/topics. Write it down in `blueprint.json` before searching.
- **The prompt wins.** Counts, marks, chapters, "no X", difficulty: whatever the teacher says overrides the patterns below.
- If the prompt names an exam, use its pattern below. If it names no exam and gives no counts, use the course: JEE → JEE Main, NEET → NEET, classes 9-12 → CBSE of that class, class 8 → CBSE class 9 shape scaled to the prompt's length.
- One subject only ("JEE Maths paper"): that subject's share of the pattern.
- Chapters: if the prompt names a book or chapter, match it in `chapters.txt` (titles may be in capitals or misspelt; match by meaning). Otherwise spread across the relevant chapters in proportion to how much the exam usually asks from them; never more than the prompt allows from one chapter.
- Question type from the bank: **numerical** = tagged `Numerical`, or no options in the text (`o: false`); **MCQ** = has options and no `Numerical` tag. Case study / long / short answer: the `Case Study`, `Long Questions`, `Short Questions` tags and the marks.

### Exam patterns (defaults; checked Nov 2026; the prompt overrides)

- **JEE Main (Paper 1):** per subject, Physics, Chemistry, Mathematics: Section A 20 MCQ + Section B 5 numerical (integer answers). 75 questions, 300 marks, +4 / -1 (apply -1 to numericals too unless the prompt says otherwise). Order: Physics, Chemistry, Maths; within a subject MCQs then numericals.
- **NEET (UG):** 180 MCQs, all compulsory: Physics 45, Chemistry 45, Biology 90 (Botany 45 + Zoology 45). 720 marks, +4 / -1.
- **CBSE class 10 Mathematics (Standard):** 80 marks, 38 questions. A: 18 MCQ + 2 assertion-reason, 1 mark each. B: 5 × 2. C: 6 × 3. D: 4 × 5. E: 3 case studies × 4.
- **CBSE class 10 Science:** 80 marks, 39 questions; one mark MCQs and assertion-reason, 2-, 3- and 5-mark answers and 4-mark case studies, grouped into Biology, Chemistry and Physics parts.
- **CBSE class 12 Physics / Chemistry / Biology:** 70 marks, 33 questions. A: 16 × 1 (MCQ + assertion-reason). B: 5 × 2. C: 7 × 3. D: 2 case studies × 4. E: 3 × 5.
- **CBSE class 12 Mathematics:** 80 marks, 38 questions, the same layout as class 10 Maths.
- **CBSE classes 9 and 11:** as classes 10 and 12.
- **RBSE (Rajasthan Board):** class 10 theory 80 marks; class 12 science theory 56 marks. Section A objective (MCQ, fill in the blanks, very short answers, 1 or ½ mark), then short answers, then long/essay answers. Counts vary by subject and year: follow the prompt's counts when given; otherwise this order and total, and say in the note that the RBSE split is approximate.
- Assertion-reason and case-study questions: only where the bank has them (tags/text); otherwise fill with MCQs of the same marks and say so in the note.

### Write new (source "write")

Same quality bar as the `generate-variants` skill; read its **Write**, **Solve independently**, **Check** and **Diagrams** sections once and follow them, with these differences:
- **No bank search at all** (no `paper-search`, no duplicate check against the bank): that is the main saving. Within the paper, never write two questions that test the same thing the same way.
- **Plan each slot first** in `blueprint.json`: subject, type (MCQ / numerical / marks), topic, difficulty, and its **chapter id**. Write per chapter, up to 8 questions per batch, so the format rules and plan are read once and stay cached.
- **Choosing the chapter** (you guess the best fit; the teacher can change it before saving): from `chapters.txt` (all books and chapters of the course and subjects).
  1. A book or chapter the prompt names wins.
  2. Otherwise the chapter whose title is the topic itself (e.g. "Work, Energy and Power" for a springs question), across all books.
  3. Several books have it: never a past-paper book (titles with PYQ, previous year, JEE Main/Advanced papers, chapterwise PYQ): new questions aren't past-year questions. Among the rest, prefer the one with more questions in that chapter (the established home), then the more specific title.
  4. No chapter fits well: closest one, and set `"chapterUnsure": true`.
- Each item in the upload file also carries `"chapter": "<id>"`, `"order": <1-based position in the paper>`, `"mark"`, `"questionType"`. Positions follow the paper's order (subjects in the exam's order, then MCQ before numerical, board papers A → E).
- Independent solve: one `sonnet` solver per batch of ≤ 8, never shown the key; a second, fresh solver only on a mismatch (≤ 2 repair rounds, else replace the question). Format fixes: `haiku`. Solutions: every step a student needs, no padding.
- `node scripts/ai-runner/check.mjs batch-N.json request.json` then `node scripts/ai-runner/upload.mjs <requestId> batch-N.json` per batch (it uploads figures too). The server checks every chapter belongs to the paper's course and subjects.
- When all slots are uploaded, write the note (same labelled format as below; `Fix:` lines don't apply) with `node scripts/ai-runner/paper-note.mjs <requestId> note.txt`, then `finish.mjs <id>`. If the night's draft cap runs out: upload what is done, write the note saying how many are missing, `finish.mjs <id> --requeue` (the next run continues from `alreadyWritten`).

### Search, shortlist, choose (you)

- `node scripts/ai-runner/paper-search.mjs /tmp/ai-runner/paper/s-<subject>.json chapters=<ids> type=mcq marks=4 limit=200` (and `type=numerical` etc.). Rows: `id, ch, m, t, u (times used), o, img, a/cr (online attempts / correct rate), s (start of text)`.
- Shortlist from the rows: right chapter and type, least used, spread across the chapters of the blueprint, a sensible mix of difficulty (where `cr` exists: lower = harder; mix roughly 30% easy / 50% medium / 20% hard unless the prompt says otherwise).
- `node scripts/ai-runner/paper-full.mjs <ids.json> /tmp/ai-runner/paper/short.md` and read the shortlist: topic really matches the prompt, the question is complete (not a fragment, has its options, its figure if it refers to one), the answer line exists. Drop anything broken.
- Choose the final set to match the blueprint exactly. Order: by subject (in the exam's order), then by section/type (MCQ before numerical; board papers A → E by marks).

### Save

`paper.json`: `{ "questions": ["<id>", ... in paper order], "note": "..." }` → `node scripts/ai-runner/paper-save.mjs <requestId> paper.json`.

The **note** is for a teacher on a phone: short, plain words, no ids in prose. Write it as labelled lines; the app turns each label into its own section (lines without a label go under "More details"):

```
Summary: 40 questions · 32 MCQ + 8 numerical · JEE Main pattern, +4/-1
Covered: Work by constant and variable force; Work-energy theorem; Springs; Vertical circle
Left out: Power; collisions and explosions (as asked)
Short: Asked 5 numericals from Rotation, the bank has 2; took 3 from Work-Energy
Fix: <24-char question id> | Key says (b); the correct answer is (d)
Details: Mostly JEE Main 2022-2025 papers; none used before.
```

- `Summary`: one line: count, type split, pattern and marking.
- `Covered`: topics separated by `;` (shown as chips). `Left out`: only what the prompt excluded.
- `Short`: one line per gap (omit when there is none). Report gaps only; never write new questions or queue other requests.
- `Fix`: one line per broken bank question you skipped (wrong key, incomplete or wrong stem, missing figure): the full question id, `|`, the problem in one short sentence. The teacher fixes it from the card.
- `Details`: anything else worth knowing (assumptions, sources), briefly.

## End of run

Short summary per request: questions and marks, pattern, shortfalls, final status.
