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
