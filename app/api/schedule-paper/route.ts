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
