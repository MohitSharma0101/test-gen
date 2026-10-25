import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Attendance, { TAttendance } from "@/models/Attendance";
import User from "@/models/User";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { _id, batch, absentUsers, date, faceAudit } =
      (await request.json()) as TAttendance;

    if (!batch || !date) {
      return NextResponse.json(
        {
          status: "error",
          error: "Batch, date and absent users are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    // Only set faceAudit when this submission came from the photo flow, so a
    // later manual edit does not wipe the record of what the machine suggested.
    const payload: Record<string, any> = { batch, absentUsers, date };
    if (faceAudit) payload.faceAudit = faceAudit;

    let result;
    if (_id) {
      result = await Attendance.findByIdAndUpdate(_id, payload, { new: true });
    } else {
      result = await Attendance.create(payload);
    }

    return NextResponse.json(
      { status: "success", attendance: result },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get("batchId");
    const date = searchParams.get("date");

    if (!batchId || !date) {
      return nextError("Batch ID and date are required");
    }

    await dbConnect();
    const attendance = await Attendance.find({
      batch: batchId,
      date: date,
    });

    const users = await User.find({ batchIds: batchId })
      .sort({ name: 1 })
      .select("name parentPhone");

    return nextSuccess({ attendance: attendance?.[0], users: users });
  } catch (err: any) {
    return nextError(err.message);
  }
};
