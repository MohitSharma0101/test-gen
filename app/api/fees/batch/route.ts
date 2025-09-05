import { dbConnect } from "@/lib/dbUtils";
import { NextRequest, NextResponse } from "next/server";
import Batch from "@/models/Batch";
import FeeSummary from "@/models/FeeSummary";
import User, { TUserWithFeeSummary } from "@/models/User";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json(
        { status: "error", error: "batchId is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const users = await User.find({ batchIds: batchId })
      .populate("batchIds feeSummary")
      .lean();

    const usersWithFeeSummary = (users as any as TUserWithFeeSummary[]).map(
      (user) => {
        const totalFee = user.batchIds?.reduce(
          (acc, batch) => acc + batch.fee,
          0
        );
        const totalPaid = user.feeSummary?.totalPaid || 0;
        const due = totalFee - totalPaid;
        return {
          ...user,
          feeSummary: {
            ...user.feeSummary,
            due: due,
            totalFee: totalFee,
          },
        };
      }
    );

    return nextSuccess({
      users: usersWithFeeSummary,
    });
  } catch (err: any) {
    return nextError(err.message);
  }
};
