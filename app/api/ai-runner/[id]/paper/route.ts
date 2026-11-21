import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { isRunner } from "@/lib/aiRequests";
import AiRequest, { TAiRequest, TPaperInput } from "@/models/AiRequest";
import Paper from "@/models/Paper";
import Question from "@/models/Question";
import { PaperStatus } from "@/data/const";

/**
 * Runner (make-paper) saves the paper of a claimed request: { questions:
 * [ids in paper order], note }. It is a normal Draft paper (title = the
 * request's name, author = whoever asked). Saving again (a re-run) replaces
 * that paper's questions instead of making a second paper.
 */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.questions) ? body.questions.map(String) : [];
    if (!ids.length || ids.length > 250) return nextError("Give 1 to 250 questions", 400);
    if (ids.some((id) => !mongoose.isValidObjectId(id))) return nextError("Bad question id", 400);
    if (new Set(ids).size !== ids.length) return nextError("A question is in the paper twice", 400);
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 3000) : "";

    await dbConnect();
    const request = await AiRequest.findOne({ _id: params.id, type: "paper", status: "running" })
      .select("input createdBy result")
      .lean<Pick<TAiRequest, "input" | "createdBy" | "result">>();
    if (!request) return nextError("This request isn't claimed by the runner", 409);
    const found = await Question.find({ _id: { $in: ids } }).select("mark").lean<{ _id: unknown; mark?: number }[]>();
    if (found.length !== ids.length) return nextError(`${ids.length - found.length} question ids don't exist`, 400);
    const marks = found.reduce((t, q) => t + (Number(q.mark) || 1), 0);

    const input = request.input as unknown as TPaperInput;
    let paperId = request.result?.paper ? String(request.result.paper) : "";
    if (paperId && (await Paper.exists({ _id: paperId }))) {
      await Paper.updateOne({ _id: paperId }, { $set: { questions: ids } });
    } else {
      const paper = await Paper.create({ title: input.name, author: request.createdBy, course: input.course, status: PaperStatus.DRAFT, questions: ids });
      paperId = String(paper._id);
    }
    await AiRequest.updateOne({ _id: params.id }, { $set: { result: { paper: paperId, note, questions: ids.length, marks } } });
    return nextSuccess({ paper: paperId, questions: ids.length, marks });
  } catch (err) {
    return nextError(err);
  }
};
