# Parked ideas

Ideas discussed and agreed in principle but not started. Each lists the
decisions already made, so work can resume without re-asking.

---

## OMR: offline MCQ tests marked from phone photos

Status: **parked** (2026-11-20). No AI: classic image processing.

### Why

Offline JEE/NEET mock tests are the norm in tier-2 coaching. Students fill
bubbles on paper; teachers mark by hand or pay ₹2–5 per sheet to OMR vendors.
Reading the bubbles from a phone photo and marking with the existing marking
code puts offline tests into results, ranks and Insights like online ones.

### Decisions

| Question | Decision |
|---|---|
| What it reads | MCQ answer bubbles only (not handwriting, not printed questions) |
| Paper size | Varies by test; up to **180 questions** |
| Input | **Phone photos** (no scanner) |
| Scanned images | **Not kept**. Only the results are saved |
| Where results go | Existing answer-sheet records; marked by `analyseTest` (lib/test-utils.ts) |

### Plan

1. **Sheet generator (staff app).** A printable OMR sheet per test:
   - four solid corner markers, used to straighten the photo;
   - a QR code with the test (schedule) id, so a photo can't be matched to the wrong test;
   - a student block: roll-number bubbles, or a printed QR per student;
   - question rows 1…N (N ≤ 180) with bubbles A–D, laid out over as many
     columns/pages as needed;
   - printed through the existing paper print flow.
2. **Scanner (browser, teacher's phone).**
   - Take a photo, then find the 4 markers and apply a perspective transform
     to straighten the page.
   - Read the QR codes to get the test and the student.
   - For each bubble, compute the share of dark pixels. It counts as filled
     when it's clearly darker than the others in its row.
   - OpenCV.js in the browser: no server load, no function time limits, no
     cost. Pure-JS fallback if OpenCV.js is too heavy on low-end phones.
   - Edge cases: blank means skipped; two filled means flagged (count as wrong
     or review, to decide); faint or erased marks are flagged for review; a
     photo that's tilted, dark or blurred asks for a retake.
3. **Review screen.** Shows the photo with detected answers overlaid and flagged
   rows highlighted. One tap fixes a row, then Confirm.
4. **Save and mark.** Answers are written as an answer sheet for that student and
   test, then marked by the existing code. The photo is discarded after confirm.

### Open before building

- How an offline test is created: likely a scheduled test flagged "offline",
  which may need **one new field**. Ask before adding it (database rule in
  CLAUDE.md).
- Two filled bubbles: wrong (with negative marking) or review?
- Roll-number bubbles vs a printed QR per student.

### Effort (rough, solo)

Sheet generator 2–3 days · scanner + review 4–6 days · testing with real
printed sheets and phone photos 2–3 days.

## MCP connector: the question bank inside Claude chat

Parked Nov 2026. Expose the app's question-bank tools to Claude as a remote
MCP server (a route in this app on Vercel), so staff can make papers by
chatting in the Claude app instead of waiting for the overnight run.

### Tools

`list_chapters`, `search_questions` (cheap facts only: chapter, marks, tags,
times used, how students scored, first ~100 chars, has image),
`get_questions` (full text for a shortlist), `batch_history` (questions a
batch has seen), `create_draft_paper` (the only write). Later: variants and
answer-sheet tools.

### Why

- Conversation instead of overnight: Claude shows the blueprint, takes
  changes ("fewer numericals"), saves a Draft paper in minutes.
- The nightly skills could call the same tools instead of runner scripts.

### Limits found (Claude help pages, Nov 2026)

- Works on every plan, Free included, but Free allows only one custom
  connector and has low usage limits (a paper is tens of thousands of tokens,
  so 1-2 papers a day); free accounts may get a weaker model.
- Phone: the Claude mobile app can use custom connectors; adding one is
  easiest from claude.ai on a computer (adding on mobile is beta).
- Teachers chat in their own Claude accounts: never expose student-level
  data (marks, histories) to them, only the question bank. Sign in with the
  staff login (OAuth) so roles apply.

### Effort

About 30-40% on top of the plain "Make a paper" request type, mostly the
OAuth login and the MCP wrapper. Keep the AI requests form as the no-setup
path for teachers.

## Question fixes: Claude proposes, a teacher approves

Parked Nov 2026. Claude finds broken bank questions (the make-paper run
already lists them as "Fix:" lines in its note). Teachers shouldn't have to
work out fixes, and Claude must not change the bank on its own, so: Claude
proposes, a teacher approves with one tap (same review pattern as variant
drafts).

### Flow

1. Claude records the question, the kind of problem and a proposed fix:
   - wrong answer key: new key + corrected solution, proven by an independent
     solve (a solver that never sees either key must reach the new answer);
   - broken text (typo, garbled maths, missing option, mismatched symbol):
     corrected text that passes the render check (check.mjs);
   - can't fix (missing data or figure only the book has): explain what's
     missing, no proposal.
2. All fixes collect in one "Question fixes" AI request. Each card: before /
   after with the change highlighted, one line of why; Apply, Edit then
   apply, Dismiss. Applying a key fix re-marks past tests (lib/recheck, as
   editing does today).
3. Until fixed, the question is kept out of AI-made papers (runner search
   excludes questions with an open fix).

### Storage

Proposals in the airequests collection (approved, temporary): ~2-3 KB per fix,
deleted when applied or dismissed. Open question: also hide flagged questions
from manual Generate / Create Paper? That needs a small optional flag on
Question (a database change; ask first).

### To decide

- Fixes from the paper run only, or also a nightly audit chapter by chapter
  (start with questions students get wrong unusually often).
- The Question flag for the manual paper tools.
