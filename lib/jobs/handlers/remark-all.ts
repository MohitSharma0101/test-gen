import { Types } from "mongoose";
import AnswerSheet from "@/models/AnswerSheet";
import { recheckSchedule } from "@/lib/recheck";
import { recomputeQuestionStats } from "@/lib/questionStats";
import type { TJobHandler } from "../types";

// Tests that were marked at least once ("answers.isCorrect" set by a recheck).
const MARKED = { "answers.isCorrect": { $exists: true } };

/** Re-mark every marked test against today's answer keys. */
export const remarkAllJob: TJobHandler = {
  type: "remark-all",
  label: "Re-mark all tests",
  adminOnly: true,
  count: async () => (await AnswerSheet.distinct("schedulePaper", MARKED)).length,
  // Next test id after the cursor; served by the { schedulePaper, user } index.
  next: async (cursor) => {
    const sheet = await AnswerSheet.findOne(
      cursor ? { ...MARKED, schedulePaper: { $gt: new Types.ObjectId(cursor) } } : MARKED
    )
      .sort({ schedulePaper: 1 })
      .select("schedulePaper")
      .lean<{ schedulePaper: Types.ObjectId }>();
    return sheet ? String(sheet.schedulePaper) : null;
  },
  // Difficulty stats are refreshed once in finish(), not per test.
  run: async (scheduleId) => {
    await recheckSchedule(scheduleId, { stats: false });
  },
  finish: async () => {
    await recomputeQuestionStats();
  },
};
