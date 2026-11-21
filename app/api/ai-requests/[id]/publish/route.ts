import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest, { TAiRequest, TCheckInput } from "@/models/AiRequest";
import Paper from "@/models/Paper";
import ExamResult from "@/models/ExamResult";
import { deleteAiRequests } from "@/lib/aiRequests";

/**
 * Publish a reviewed "check": one Exam Result (totals, as if typed in, plus
 * every answer's marks / mistake / note), then the request and its page
 * images are deleted. Students without a checked sheet get no row.
 */
export const POST = async (_req: NextRequest, { params }: { params: { id: string } }) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    await dbConnect();
    const request = await AiRequest.findOne({ _id: params.id, type: "check", status: "review" })
      .select("input checked")
      .lean<TAiRequest>();
    if (!request) return nextError("This check isn't ready to publish", 409);
    const input = request.input as unknown as TCheckInput;
    const sheets = request.checked ?? [];
    if (!sheets.length) return nextError("No answer sheets were checked", 400);

    const paper = await Paper.findById(input.paper)
      .select("questions")
      .populate({ path: "questions", select: "mark" })
      .lean<{ questions: { _id: unknown; mark?: number }[] }>();
    if (!paper) return nextError("The paper was deleted", 404);
    const totalMarks = paper.questions.reduce((sum, q) => sum + (Number(q.mark) || 1), 0);

    const result = await ExamResult.create({
      name: input.name,
      batchId: input.batch,
      subject: input.subject,
      date: new Date(input.date),
      totalMarks,
      paper: input.paper,
      results: sheets.map((s) => ({
        userId: s.student,
        marks: Math.round(s.answers.reduce((sum, a) => sum + (Number(a.marks) || 0), 0) * 100) / 100,
        answers: s.answers.map(({ question, answer, marks, mistakeType, note }) => ({ question, answer, marks, mistakeType, note })),
      })),
    });
    await deleteAiRequests({ _id: params.id });
    return nextSuccess({ examResult: String(result._id), students: sheets.length }, 201);
  } catch (err) {
    return nextError(err);
  }
};
