import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest, { TAiRequest } from "@/models/AiRequest";
import Paper from "@/models/Paper";
import { PaperStatus, TAG } from "@/data/const";
import Question from "@/models/Question";
import type { TPaperInput } from "@/models/AiRequest";
import { deleteAiRequests } from "@/lib/aiRequests";

/**
 * "Save paper" on a finished "paper" request, then the request is closed.
 * - Picked from the bank: the Draft paper Claude made gets the chosen status.
 * - Written new: its questions (waiting in the request) are added to the bank
 *   in their chapters, tagged AI Generated, and the paper is created from them.
 * { status }: PUBLIC (default), PRIVATE, or DRAFT (to open it in Create Paper).
 */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json().catch(() => ({}));
    const status = [PaperStatus.PRIVATE, PaperStatus.DRAFT].includes(body?.status) ? body.status : PaperStatus.PUBLIC;
    await dbConnect();
    const request = await AiRequest.findOne({ _id: params.id, type: "paper", status: "review" })
      .select("result input drafts createdBy")
      .lean<Pick<TAiRequest, "result" | "input" | "drafts" | "createdBy">>();
    if (!request) return nextError("This request has no paper to save", 409);

    if (!request.result?.paper) {
      // Written new: questions go into the bank now, in paper order
      const drafts = [...(request.drafts ?? [])].filter((d) => d.chapter).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (!drafts.length) return nextError("This request has no paper to save", 409);
      const input = request.input as unknown as TPaperInput;
      const inserted = await Question.insertMany(
        drafts.map((d) => ({
          text: d.text,
          ans: d.ans,
          chapter: d.chapter,
          ...(d.mark ? { mark: d.mark } : {}),
          tags: [...(d.questionType === "NUMERICAL" ? [TAG.NUMERICAL] : []), TAG.AI_GENERATED],
        }))
      );
      const paper = await Paper.create({
        title: input.name,
        author: request.createdBy,
        course: input.course,
        status,
        questions: inserted.map((q) => q._id),
      });
      await deleteAiRequests({ _id: params.id });
      return nextSuccess({ paper: String(paper._id), status, added: inserted.length });
    }
    const res = await Paper.updateOne({ _id: request.result.paper }, { $set: { status } });
    if (!res.matchedCount) return nextError("The paper was deleted from Papers", 404);
    await deleteAiRequests({ _id: params.id });
    return nextSuccess({ paper: String(request.result.paper), status });
  } catch (err) {
    return nextError(err);
  }
};
