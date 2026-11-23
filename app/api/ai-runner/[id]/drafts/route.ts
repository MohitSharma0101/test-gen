import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import AiRequest, { type TPaperInput } from "@/models/AiRequest";
import Book from "@/models/Book";
import Chapter from "@/models/Chapter";
import { isRunner, NIGHT_AI_IMAGE_CAP, NIGHT_DRAFT_CAP, RUNNER_LOCK_MS, usedLast24h } from "@/lib/aiRequests";

const MAX_BATCH = 25;

/**
 * Nightly runner: add finished, checked drafts to a request it has claimed.
 * Body { drafts: [{ text, ans, questionType, mark?, sourceQuestion?, diagram?,
 * checks: { keyMatch, renderOk, notes? } }] }. Only drafts whose independent
 * solve matched the key are accepted: the skill drops the rest, and this is
 * the backstop. The caps are enforced here too.
 */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const { drafts } = (await req.json()) as { drafts?: any[] };
    if (!Array.isArray(drafts) || !drafts.length) return nextError("No drafts", 400);
    if (drafts.length > MAX_BATCH) return nextError(`At most ${MAX_BATCH} drafts per call`, 400);

    const clean = drafts.map((d) => ({
      text: String(d?.text ?? "").trim(),
      ans: String(d?.ans ?? "").trim(),
      questionType: d?.questionType === "NUMERICAL" ? "NUMERICAL" : "MCQ",
      ...(Number(d?.mark) > 0 ? { mark: Number(d.mark) } : {}),
      ...(d?.sourceQuestion && mongoose.isValidObjectId(d.sourceQuestion) ? { sourceQuestion: d.sourceQuestion } : {}),
      ...(d?.diagram?.url && ["svg", "ai-image", "web-image"].includes(d.diagram.kind) ? { diagram: { kind: d.diagram.kind, url: String(d.diagram.url) } } : {}),
      checks: { keyMatch: d?.checks?.keyMatch === true, renderOk: d?.checks?.renderOk === true, notes: String(d?.checks?.notes ?? "").slice(0, 300) },
      status: "pending",
      // "paper" (write) only, checked below
      ...(d?.chapter ? { chapter: String(d.chapter), order: Number(d?.order) || 0, chapterUnsure: d?.chapterUnsure === true } : {}),
    }));
    const bad = clean.findIndex((d) => !d.text || !d.ans || !d.checks.keyMatch || !d.checks.renderOk);
    if (bad >= 0) return nextError(`Draft ${bad + 1} is empty or failed its checks; only verified drafts are accepted`, 400);

    await dbConnect();
    // A paper's questions must each have a chapter of the paper's course and subjects
    const request = await AiRequest.findOne({ _id: params.id, status: "running" }).select("type input").lean<{ type: string; input: TPaperInput }>();
    if (!request) return nextError("This request isn't claimed by the runner", 409);
    if (request.type === "paper") {
      const ids = Array.from(new Set(clean.map((d: any) => d.chapter).filter(Boolean)));
      if (clean.some((d: any) => !d.chapter)) return nextError("Every paper question needs its chapter", 400);
      if (ids.some((id) => !mongoose.isValidObjectId(id))) return nextError("Bad chapter id", 400);
      const books = await Book.find({ course: request.input.course, subject: { $in: request.input.subjects } }).select("_id").lean();
      const ok = await Chapter.countDocuments({ _id: { $in: ids }, book: { $in: books.map((b) => b._id) } });
      if (ok !== ids.length) return nextError("A chapter isn't in this paper's course and subjects", 400);
    }
    const used = await usedLast24h();
    if (used.drafts + clean.length > NIGHT_DRAFT_CAP) return nextError("Tonight's draft cap would be exceeded", 429);
    const images = clean.filter((d: any) => d.diagram?.kind === "ai-image").length;
    if (used.aiImages + images > NIGHT_AI_IMAGE_CAP) return nextError("Tonight's AI image cap would be exceeded", 429);

    const res = await AiRequest.updateOne(
      { _id: params.id, status: "running" },
      { $push: { drafts: { $each: clean } }, $set: { lockedUntil: new Date(Date.now() + RUNNER_LOCK_MS) } }
    );
    if (!res.matchedCount) return nextError("This request isn't claimed by the runner", 409);
    return nextSuccess({ added: clean.length });
  } catch (err) {
    return nextError(err);
  }
};
