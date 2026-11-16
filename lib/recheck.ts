import { Types } from "mongoose";
import { analyseTest } from "@/lib/test-utils";
import { recomputeQuestionStats } from "@/lib/questionStats";
import AnswerSheet, { TAnswerSheet } from "@/models/AnswerSheet";
import SchedulePaper, { TSchedulePaper } from "@/models/SchedulePaper";
import Paper from "@/models/Paper";
import "@/models/Question";
import "@/models/Chapter";

/**
 * Marks every answer sheet of one scheduled test against the paper's current
 * answer key, and refreshes the questions' measured difficulty. Returns the
 * number of sheets marked. Callers must have run dbConnect().
 */
export async function recheckSchedule(scheduleId: string, { stats = true }: { stats?: boolean } = {}) {
  const schedule = await SchedulePaper.findById(scheduleId)
    .populate({ path: "paper", select: "title questions", populate: { path: "questions" } })
    .lean<TSchedulePaper>();
  if (!schedule) throw new Error("Schedule or associated paper not found.");

  const questions = schedule.paper?.questions ?? [];
  const answerSheets = await AnswerSheet.find({ schedulePaper: scheduleId }).lean<TAnswerSheet[]>();
  if (!answerSheets.length) return 0;

  await AnswerSheet.bulkWrite(
    answerSheets.map((sheet) => {
      const analysis = analyseTest(questions, sheet.answers);
      return {
        updateOne: {
          filter: { schedulePaper: sheet.schedulePaper, user: sheet.user },
          update: {
            $set: {
              answers: analysis?.analysedAns ?? sheet.answers,
              correctAns: analysis?.correctAns,
              incorrectAns: analysis?.incorrectAns,
              skippedAns: analysis?.skippedAns,
              totalMarks: analysis?.totalMarks,
              obtainedMarks: analysis?.obtainedMarks,
            },
          },
        },
      };
    })
  );

  // Fresh results change these questions' measured difficulty. A failure
  // here must not fail the recheck itself. Bulk runs skip it and recompute
  // every question once at the end instead.
  if (stats) try {
    await recomputeQuestionStats(questions.map((q: any) => String(q?._id ?? q)).filter(Boolean));
  } catch (err) {
    console.error("question stats refresh failed", err);
  }
  return answerSheets.length;
}

/**
 * After a question's answer key or marks change: re-mark every test that
 * question was in, so results, ranks and insights stop showing the old
 * verdict. Only tests already marked once are touched; a test nobody has
 * rechecked yet keeps waiting for the teacher, as before.
 */
export async function recheckSchedulesForQuestion(questionId: string) {
  const qid = new Types.ObjectId(questionId);
  const paperIds = await Paper.find({ questions: qid }).distinct("_id");
  if (!paperIds.length) return 0;
  const scheduleIds = await SchedulePaper.find({ paper: { $in: paperIds } }).distinct("_id");

  let tests = 0;
  for (const id of scheduleIds) {
    const marked = await AnswerSheet.exists({ schedulePaper: id, "answers.isCorrect": { $exists: true } });
    if (!marked) continue;
    await recheckSchedule(String(id));
    tests++;
  }
  return tests;
}
