import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import SchedulePaper from "@/models/SchedulePaper";
import AnswerSheet from "@/models/AnswerSheet";
import { attemptedStudentIds, validateStudentIds } from "@/lib/scheduleStudents";

export const POST = async (request: NextRequest) => {
  try {
    const { paperId, duration, startTime, endTime, batchId, studentIds } = await request.json();

    // validations
    if (!paperId || !duration || !batchId || !startTime || !endTime) {
      return nextError("All fields are required.");
    }

    await dbConnect();

    // Optional: only these students of the batch take it
    let students: string[] | undefined;
    if (studentIds != null) {
      const checked = await validateStudentIds(batchId, studentIds);
      if (checked.error) return nextError(checked.error, 400);
      students = checked.ids;
    }

    // create schedule paper
    const newSchedulePaper = await SchedulePaper.create({
      paper: paperId,
      duration,
      startTime,
      endTime,
      batch: batchId,
      ...(students ? { students } : {}),
    });

    return nextSuccess({
      status: "success",
      schedulePaper: newSchedulePaper,
    });
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return nextError("Batch ID is required.");
    }

    await dbConnect();

    const schedulePapers = await SchedulePaper.find({ batch: batchId }).sort({ createdAt: -1 }).populate("paper");

    return nextSuccess({
      status: "success",
      results: schedulePapers.length,
      schedulePapers,
    });
  } catch (err: any) {
    return nextError(err.message || "Failed to fetch schedule papers.");
  }
};

// Change who takes a test. studentIds: a list, or null for the whole batch.
// Students who already started or submitted can't be left out: their answer
// sheet and result would belong to a test they no longer have.
export const PATCH = async (request: NextRequest) => {
  try {
    const { schedulePaperId, studentIds } = await request.json();
    if (!schedulePaperId) return nextError("Schedule Paper ID is required.", 400);

    await dbConnect();
    const schedule = await SchedulePaper.findById(schedulePaperId).select("batch").lean<{ batch?: unknown }>();
    if (!schedule) return nextError("Test not found.", 404);

    if (studentIds === null) {
      await SchedulePaper.updateOne({ _id: schedulePaperId }, { $unset: { students: 1 } });
      return nextSuccess({ students: null });
    }

    const checked = await validateStudentIds(String(schedule.batch), studentIds);
    if (checked.error) return nextError(checked.error, 400);
    const attempted = await attemptedStudentIds(schedulePaperId);
    const missing = attempted.filter((id) => !checked.ids!.includes(id));
    if (missing.length) {
      return nextError(
        `${missing.length} student${missing.length === 1 ? " has" : "s have"} already attempted this test and can't be removed.`,
        409
      );
    }
    await SchedulePaper.updateOne({ _id: schedulePaperId }, { $set: { students: checked.ids } });
    return nextSuccess({ students: checked.ids });
  } catch (err: any) {
    return nextError(err.message || "Failed to update the test.");
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const schedulePaperId = searchParams.get("schedulePaperId");

    if (!schedulePaperId) {
      return nextError("Schedule Paper ID is required.");
    }

    await dbConnect();

    const answerSheets = await AnswerSheet.find({ schedulePaper: schedulePaperId });
    if (answerSheets.length > 0) {
      return nextError("Paper is already attempted by students.");
    }

    const deletedSchedulePaper = await SchedulePaper.findByIdAndDelete(schedulePaperId);

    if (!deletedSchedulePaper) {
      return nextError("Schedule paper not found.");
    }

    return nextSuccess({
      status: "success",
      message: "Schedule paper deleted successfully.",
    });
  } catch (err: any) {
    return nextError(err.message || "Failed to delete schedule paper.");
  }
};
