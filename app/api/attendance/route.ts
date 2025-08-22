import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Attendance, { TAttendance } from "@/models/Attendance";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { _id, batch, absentUsers, date } =
      (await request.json()) as TAttendance;

    if (!batch || !absentUsers?.length || !date) {
      return nextError("Batch, date and absent users are required.", 400);
    }

    await dbConnect();

    let result;
    if (_id) {
      result = await Attendance.findByIdAndUpdate(
        _id,
        { batch, absentUsers, date },
        { new: true }
      );
    } else {
      result = await Attendance.create({ batch, absentUsers, date });
    }

    return nextSuccess({ attendance: result }, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get("batchId");
    const date = searchParams.get("date");

    if (!batchId || !date) {
      return nextError("Batch ID and date are required", 400);
    }

    await dbConnect();
    const attendance = await Attendance.find({
      batch: batchId,
      date: date,
    });

    return nextSuccess({ attendance: attendance?.[0] }, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};
