import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import { recomputeQuestionStats } from "@/lib/questionStats";

// Recompute every question's measured difficulty from all answer sheets.
// Rechecks already refresh their own questions; this catches up on history.
export const maxDuration = 60;

export const POST = async (_request: NextRequest) => {
  try {
    const account = await getAccount();
    if (!account) return nextError("Please log in", 401);
    if (account.role !== Role.ADMIN) return nextError("Only admins can refresh question stats", 403);
    await dbConnect();
    const result = await recomputeQuestionStats();
    return nextSuccess(result);
  } catch (err) {
    return nextError(err);
  }
};
