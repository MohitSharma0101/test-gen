import mongoose from "mongoose";
import User from "@/models/User";
import AnswerSheet from "@/models/AnswerSheet";

/**
 * Validates a "selected students" list for a test of `batchId`. Returns the
 * cleaned ids (unique, valid) or an error message. Every id must belong to
 * the batch: a test can't be handed to someone outside it.
 */
export async function validateStudentIds(batchId: string, studentIds: unknown) {
  if (!Array.isArray(studentIds)) return { error: "studentIds must be a list" };
  const ids = Array.from(new Set(studentIds.map(String)));
  if (!ids.length) return { error: "Choose at least one student, or schedule it for the whole batch." };
  if (ids.some((id) => !mongoose.isValidObjectId(id))) return { error: "Invalid student id" };
  const inBatch = await User.countDocuments({ _id: { $in: ids }, batchIds: batchId });
  if (inBatch !== ids.length) return { error: "Some selected students are not in this batch." };
  return { ids };
}

/** Students who already started or submitted this test (they can't be removed). */
export const attemptedStudentIds = async (scheduleId: string) =>
  (await AnswerSheet.distinct("user", { schedulePaper: scheduleId })).map(String);
