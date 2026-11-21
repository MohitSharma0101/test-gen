import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest, { TAiRequest, TCheckInput } from "@/models/AiRequest";
import Paper from "@/models/Paper";
import { MISTAKE_TYPES } from "@/models/ExamResult";

/**
 * Review of a "check" request: the teacher corrects one answer of one sheet
 * (marks, mistake type, note). Marks stay within the question's own marks
 * (down to minus that, for negative marking).
 */
export const PATCH = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json();
    const sheetId = String(body?.sheetId ?? "");
    const question = String(body?.question ?? "");
    if (!mongoose.isValidObjectId(sheetId) || !mongoose.isValidObjectId(question)) return nextError("Answer not found", 400);

    await dbConnect();
    const request = await AiRequest.findOne({ _id: params.id, type: "check", status: "review" })
      .select("input.paper")
      .lean<Pick<TAiRequest, "input">>();
    if (!request) return nextError("This check isn't ready for review", 409);
    const paper = await Paper.findById((request.input as unknown as TCheckInput).paper)
      .select("questions")
      .populate({ path: "questions", select: "mark" })
      .lean<{ questions: { _id: unknown; mark?: number }[] }>();
    const q = paper?.questions.find((x) => String(x._id) === question);
    if (!q) return nextError("That question isn't in the paper", 400);

    const set: Record<string, unknown> = { "checked.$[s].edited": true };
    if (body?.marks !== undefined) {
      const marks = Number(body.marks);
      const max = Number(q.mark) || 1;
      if (!Number.isFinite(marks) || marks > max || marks < -max) return nextError(`Marks must be between ${-max} and ${max}`, 400);
      set["checked.$[s].answers.$[a].marks"] = Math.round(marks * 4) / 4;
    }
    if (body?.mistakeType !== undefined) {
      if (body.mistakeType && !MISTAKE_TYPES.includes(body.mistakeType)) return nextError("Unknown mistake type", 400);
      set["checked.$[s].answers.$[a].mistakeType"] = body.mistakeType || undefined;
    }
    if (body?.note !== undefined) set["checked.$[s].answers.$[a].note"] = String(body.note).slice(0, 600);
    // Looked at: no longer needs attention
    set["checked.$[s].answers.$[a].flagged"] = false;

    const res = await AiRequest.updateOne(
      { _id: params.id },
      { $set: set },
      { arrayFilters: [{ "s._id": new mongoose.Types.ObjectId(sheetId) }, { "a.question": new mongoose.Types.ObjectId(question) }] }
    );
    return res.matchedCount ? nextSuccess(null) : nextError("Answer not found", 404);
  } catch (err) {
    return nextError(err);
  }
};
