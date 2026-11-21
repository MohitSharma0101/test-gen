import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest, { TAiRequest } from "@/models/AiRequest";
import Paper from "@/models/Paper";
import { PaperStatus } from "@/data/const";
import { deleteAiRequests } from "@/lib/aiRequests";

/**
 * "Save paper" on a finished "paper" request: the Draft paper Claude made
 * becomes a normal saved paper (Public unless { status: "PRIVATE" }), and the
 * request is closed. Only the status changes; the questions stay as made.
 */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json().catch(() => ({}));
    const status = body?.status === PaperStatus.PRIVATE ? PaperStatus.PRIVATE : PaperStatus.PUBLIC;
    await dbConnect();
    const request = await AiRequest.findOne({ _id: params.id, type: "paper", status: "review" }).select("result.paper").lean<Pick<TAiRequest, "result">>();
    if (!request?.result?.paper) return nextError("This request has no paper to save", 409);
    const res = await Paper.updateOne({ _id: request.result.paper }, { $set: { status } });
    if (!res.matchedCount) return nextError("The paper was deleted from Papers", 404);
    await deleteAiRequests({ _id: params.id });
    return nextSuccess({ paper: String(request.result.paper), status });
  } catch (err) {
    return nextError(err);
  }
};
