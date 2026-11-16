import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { recheckSchedule } from "@/lib/recheck";
import { NextRequest } from "next/server";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import AnswerSheet from "@/models/AnswerSheet";

// Admin: the tests already marked at least once, for "Re-mark all tests".
// The client re-marks them one PUT at a time, so no single request can run
// into the function time limit.
export const GET = async () => {
  try {
    const account = await getAccount();
    if (!account) return nextError("Please log in", 401);
    if (account.role !== Role.ADMIN) return nextError("Only admins can re-mark all tests", 403);
    await dbConnect();
    const scheduleIds = await AnswerSheet.distinct("schedulePaper", { "answers.isCorrect": { $exists: true } });
    return nextSuccess({ scheduleIds: scheduleIds.map(String) });
  } catch (err: any) {
    return nextError(err?.message || "Couldn't list the tests");
  }
};

export const PUT = async (req: NextRequest) => {
  try {
    const { scheduleId } = await req.json();
    if (!scheduleId) return nextError("Schedule ID is required.");

    await dbConnect();
    const marked = await recheckSchedule(scheduleId);
    if (!marked) return nextSuccess({ message: "No answer sheets found to analyze.", success: true });

    return nextSuccess({ message: "Answer sheets analyzed and updated successfully.", success: true });
  } catch (err: any) {
    console.error("Error in PUT /api/answer-sheets/recheck:", err);
    return nextError(err?.message || "Internal server error.");
  }
};
