import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { recheckSchedule } from "@/lib/recheck";
import { NextRequest } from "next/server";
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
