import { dbConnect } from "@/lib/dbUtils";
import { NextRequest, NextResponse } from "next/server";
import FeeSummary from "@/models/FeeSummary";
import User from "@/models/User";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import Clock from "@/lib/clock";

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { studentId, amount } = body;

    if (!studentId || !amount) {
      return NextResponse.json(
        { status: "error", error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    // find existing or create new FeeSummary
    let feeDoc = await FeeSummary.findOne({ studentId });

    if (!feeDoc) {
      feeDoc = new FeeSummary({
        studentId,
        totalPaid: amount,
        payments: [{ amount, date: Clock.getDate() }],
      });

      await feeDoc.save();

      // link feeSummaryId to the student
      await User.findByIdAndUpdate(studentId, {
        $set: { feeSummary: feeDoc._id },
      });
    } else {
      feeDoc.totalPaid += amount;
      feeDoc.payments.push({
        amount,
        date: Clock.getDate(),
      });

      await feeDoc.save();
    }

    return nextSuccess({ fee: feeDoc });
  } catch (err: any) {
    return nextError(err.message);
  }
};
