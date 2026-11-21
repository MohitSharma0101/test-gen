import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import AiRequest, { TAiRequest, TCheckInput } from "@/models/AiRequest";
import Paper from "@/models/Paper";
import { MISTAKE_TYPES } from "@/models/ExamResult";
import { isRunner, NIGHT_SHEET_CAP, sheetsLast24h } from "@/lib/aiRequests";

const MAX_PER_CALL = 10;

/**
 * Nightly runner posts marked answer sheets of a claimed "check" request:
 * { rubric?: [{question, points}], sheets: [{ student, answers: [{ question,
 * answer, marks, mistakeType, note, flagged, page }] }] }. Every question of
 * the paper must be marked, within its own marks. Re-posting a student
 * replaces that sheet (a re-run may post a student twice).
 */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json();
    const sheets = Array.isArray(body?.sheets) ? body.sheets : [];
    if (sheets.length > MAX_PER_CALL) return nextError(`At most ${MAX_PER_CALL} sheets per call`, 400);

    await dbConnect();
    const request = await AiRequest.findOne({ _id: params.id, type: "check", status: "running" })
      .select("input")
      .lean<Pick<TAiRequest, "input">>();
    if (!request) return nextError("This request isn't claimed by the runner", 409);
    const input = request.input as unknown as TCheckInput;
    const paper = await Paper.findById(input.paper)
      .select("questions")
      .populate({ path: "questions", select: "mark" })
      .lean<{ questions: { _id: unknown; mark?: number }[] }>();
    if (!paper) return nextError("The paper was deleted", 404);
    const maxOf = new Map(paper.questions.map((q) => [String(q._id), Number(q.mark) || 1]));
    const students = new Set(input.sheets.map((s) => s.student));

    const left = NIGHT_SHEET_CAP - (await sheetsLast24h());
    if (sheets.length > left) return nextError(`Tonight's cap allows ${Math.max(0, left)} more sheets`, 429);

    const clean = [];
    for (const s of sheets) {
      const student = String(s?.student ?? "");
      if (!students.has(student)) return nextError(`Student ${student} has no sheet in this request`, 400);
      const answers = Array.isArray(s?.answers) ? s.answers : [];
      const seen = new Set<string>();
      const out = [];
      for (const a of answers) {
        const q = String(a?.question ?? "");
        const max = maxOf.get(q);
        if (max === undefined || seen.has(q)) return nextError(`Bad question ${q} for ${student}`, 400);
        seen.add(q);
        const marks = Number(a?.marks);
        if (!Number.isFinite(marks) || marks > max || marks < -max) return nextError(`Marks out of range for ${q} (${student})`, 400);
        if (a?.mistakeType && !MISTAKE_TYPES.includes(a.mistakeType)) return nextError(`Unknown mistakeType "${a.mistakeType}"`, 400);
        out.push({
          question: q,
          answer: typeof a?.answer === "string" ? a.answer.slice(0, 400) : undefined,
          marks: Math.round(marks * 4) / 4,
          mistakeType: a?.mistakeType || undefined,
          note: typeof a?.note === "string" && a.note.trim() ? a.note.trim().slice(0, 600) : undefined,
          flagged: Boolean(a?.flagged),
          page: Number.isInteger(a?.page) ? a.page : undefined,
        });
      }
      if (seen.size !== maxOf.size) return nextError(`Sheet for ${student} must mark all ${maxOf.size} questions (got ${seen.size})`, 400);
      clean.push({ student, answers: out });
    }

    const rubric = Array.isArray(body?.rubric)
      ? body.rubric
          .filter((r: { question?: unknown }) => maxOf.has(String(r?.question)))
          .map((r: { question: string; points?: unknown }) => ({ question: r.question, points: String(r.points ?? "").slice(0, 1500) }))
      : null;

    const ids = clean.map((c) => new mongoose.Types.ObjectId(c.student));
    await AiRequest.updateOne({ _id: params.id }, { $pull: { checked: { student: { $in: ids } } } });
    await AiRequest.updateOne(
      { _id: params.id },
      { $push: { checked: { $each: clean } }, ...(rubric?.length ? { $set: { rubric } } : {}) }
    );
    return nextSuccess({ saved: clean.length });
  } catch (err) {
    return nextError(err);
  }
};
