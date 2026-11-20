import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest, { TAiRequest } from "@/models/AiRequest";
import Question from "@/models/Question";
import Chapter from "@/models/Chapter";
import { TAG } from "@/data/const";

/**
 * Approved drafts become questions in the request's chapter, or in another
 * chapter the reviewer picks (`chapterId` in the body). When nothing is
 * left to review, the request is deleted (the user's rule: requests don't
 * linger once their questions are in the bank).
 */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json().catch(() => ({}));
    const chapterId: unknown = body?.chapterId;
    if (chapterId !== undefined && !mongoose.isValidObjectId(chapterId)) return nextError("Chapter not found", 400);

    await dbConnect();
    const request = await AiRequest.findById(params.id).lean<TAiRequest>();
    if (!request) return nextError("Request not found", 404);
    const approved = request.drafts.filter((d) => d.status === "approved");
    if (!approved.length) return nextError("Approve at least one question first.", 400);
    if (chapterId && !(await Chapter.exists({ _id: chapterId }))) return nextError("Chapter not found", 400);
    const chapter = chapterId ?? request.target.chapter;

    await Question.insertMany(
      approved.map((d) => ({
        text: d.text,
        ans: d.ans,
        chapter,
        ...(d.mark ? { mark: d.mark } : {}),
        tags: d.questionType === "NUMERICAL" ? [TAG.NUMERICAL] : [],
      }))
    );
    const ids = approved.map((d) => new mongoose.Types.ObjectId(String(d._id)));
    await AiRequest.updateOne(
      { _id: params.id },
      { $set: { "drafts.$[d].status": "uploaded" } },
      { arrayFilters: [{ "d._id": { $in: ids } }] }
    );

    const leftToReview = request.drafts.some((d) => d.status === "pending");
    if (!leftToReview && request.status !== "running") await AiRequest.deleteOne({ _id: params.id });
    return nextSuccess({ uploaded: approved.length, removed: !leftToReview });
  } catch (err) {
    return nextError(err);
  }
};
