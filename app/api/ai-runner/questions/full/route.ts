import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { isRunner } from "@/lib/aiRequests";
import Question from "@/models/Question";

/** Runner (make-paper): full text and answer of a shortlist. { ids: [...] } (max 150). */
export const POST = async (req: NextRequest) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  try {
    const body = await req.json();
    const ids: string[] = (Array.isArray(body?.ids) ? body.ids : []).filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id));
    if (!ids.length || ids.length > 150) return nextError("Give 1 to 150 question ids", 400);
    await dbConnect();
    const rows = await Question.find({ _id: { $in: ids } }).select("text ans mark tags chapter timesUsed").lean();
    return nextSuccess({ questions: rows });
  } catch (err) {
    return nextError(err);
  }
};
