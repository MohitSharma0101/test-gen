import mongoose from "mongoose";
import AnswerSheet from "@/models/AnswerSheet";
import Question from "@/models/Question";

type TAcc = { attempts: number; correct: number; time: number; topA: number; topC: number; botA: number; botC: number };

// Recomputes Question.stats from every answer sheet that contains these
// questions (all questions when none are given). Only answers with a known
// result count (isCorrect set by the recheck); skips aren't attempts.
// Discrimination ranks each test's sheets by score: the top third vs the
// bottom third, per question.
export const recomputeQuestionStats = async (questionIds?: string[]) => {
  const ids = (questionIds ?? []).filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
  const sheets = (await AnswerSheet.find(ids.length ? { "answers.question": { $in: ids } } : {})
    .select("schedulePaper obtainedMarks answers.question answers.isCorrect answers.timeSpent")
    .lean()) as any[];

  const wanted = ids.length ? new Set(ids.map(String)) : null;
  // Tercile cut-offs per test
  const byTest = new Map<string, number[]>();
  for (const s of sheets) {
    const k = String(s.schedulePaper);
    (byTest.get(k) ?? byTest.set(k, []).get(k)!).push(Number(s.obtainedMarks) || 0);
  }
  const cuts = new Map<string, { low: number; high: number; n: number }>();
  byTest.forEach((scores, k) => {
    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;
    cuts.set(k, { low: sorted[Math.floor((n - 1) / 3)] ?? 0, high: sorted[Math.ceil(((n - 1) * 2) / 3)] ?? 0, n });
  });

  const acc = new Map<string, TAcc>();
  for (const s of sheets) {
    const cut = cuts.get(String(s.schedulePaper));
    const score = Number(s.obtainedMarks) || 0;
    // Groups only mean something with enough students in the test
    const top = cut && cut.n >= 6 && score >= cut.high;
    const bottom = cut && cut.n >= 6 && score <= cut.low;
    for (const a of s.answers ?? []) {
      const id = String(a?.question ?? "");
      if (!id || typeof a.isCorrect !== "boolean" || (wanted && !wanted.has(id))) continue;
      const e = acc.get(id) ?? { attempts: 0, correct: 0, time: 0, topA: 0, topC: 0, botA: 0, botC: 0 };
      e.attempts += 1;
      if (a.isCorrect) e.correct += 1;
      e.time += Number(a.timeSpent) || 0;
      if (top) {
        e.topA += 1;
        if (a.isCorrect) e.topC += 1;
      }
      if (bottom) {
        e.botA += 1;
        if (a.isCorrect) e.botC += 1;
      }
      acc.set(id, e);
    }
  }

  const now = new Date();
  const ops = Array.from(acc.entries()).map(([id, e]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: {
        $set: {
          stats: {
            attempts: e.attempts,
            correct: e.correct,
            correctRate: e.attempts ? e.correct / e.attempts : 0,
            avgTime: e.attempts ? e.time / e.attempts : 0,
            discrimination: e.topA >= 3 && e.botA >= 3 ? e.topC / e.topA - e.botC / e.botA : null,
            updatedAt: now,
          },
        },
      },
    },
  }));
  if (ops.length) await Question.bulkWrite(ops, { ordered: false });
  return { questions: ops.length, sheets: sheets.length };
};
