# Online-test insights

Data: AnswerSheet answers (isCorrect, timeSpent) set by the recheck; skips are
paper questions without an answer.

- Question.stats (lib/questionStats.ts): attempts, correct, correctRate,
  avgTime, discrimination (top-third minus bottom-third accuracy per test).
  Refreshed for a paper's questions on every recheck; admins can recompute
  all (POST /api/question-stats, "Refresh difficulty data").
- Difficulty (lib/difficulty.ts): easy ≥70% right, medium 40–70, hard <40,
  rated from 5 attempts. Suspect: ≥10 attempts and <15% right, or
  discrimination < -0.1. Badges on question cards; "Difficulty" filter per
  subject in Generate Paper (only rated questions qualify).
- Student (GET /api/users/:id/insights, student page section): chapter
  mastery weakest first with a 30-day trend, persistent gaps (wrong in 3+
  tests, <60%) + practice paper, how marks are lost (rushing <0.5× / stuck
  >1.5× the question's average time; skips in the last quarter = out of
  time), accuracy by tag and by marks.
- Batch (GET /api/batches/:id/insights, Online Test → Insights): re-teach
  list (accuracy, students below 50%), groups per weak chapter + practice
  paper, hardest and suspect questions with Generate variant (+ Fix answer
  for suspect). Generate variant also on each question in Analyze.
- Generate variant hand-off (lib/variantHandoff.ts): adds a text tab to the
  persisted variants store and points "save to" at the question's chapter.
Not built (by request): the leaving-the-screen integrity flag.

v2: student insights open in a drawer (page keeps a summary card); chapters
grouped by subject with search. The marks-lost section (rushing/stuck, then
"where marks go") was removed: it gave teachers nothing to act on.
