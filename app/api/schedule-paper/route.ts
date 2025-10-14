import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import SchedulePaper from "@/models/SchedulePaper";

export const POST = async (request: NextRequest) => {
  try {
    const { paperId, duration, startTime, endTime, batchId } =
      await request.json();

    // validations
    if (!paperId || !duration || !batchId || !startTime || !endTime) {
      return nextError("All fields are required.");
    }

    await dbConnect();

    // create schedule paper
    const newSchedulePaper = await SchedulePaper.create({
      paper: paperId,
      duration,
      startTime,
      endTime,
      batch: batchId,
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