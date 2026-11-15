# Weak-area practice papers

Online Test → Analyze shows "Weak chapters" (chapters of the hard questions,
most hard questions first) and "Practice paper from these N chapters".
That writes a hand-off (lib/practicePrefill.ts, localStorage, read once) and
opens Generate Paper with those chapters picked per subject (20 questions
each, editable) and a banner naming the test. The teacher presses Generate.
Fixed: the analysis API selected `cousre` (typo), so the chapter's class was
never loaded. Navigation happens without closing the window first (closing
made the back-button handler undo the push).
