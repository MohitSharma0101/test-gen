import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Attendance, { TAttendance } from "@/models/Attendance";

export const POST = async (request: NextRequest) => {
  try {
    const { _id, batch, absentUsers, date } =
      (await request.json()) as TAttendance;

    if (!batch || absentUsers?.length <= 0 || !date) {
      return NextResponse.json(
        {
          status: "error",
          error: "Batch, date and absent users are required.",
        },
        { status: 500 }
      );
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
      return NextResponse.json(
        { status: "error", error: "Batch ID and date are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const attendance = await Attendance.find({
      batch: batchId,
      date: date,
    });
    return NextResponse.json({ attendance: attendance?.[0] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
