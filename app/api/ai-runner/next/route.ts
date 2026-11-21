import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import AiRequest, { TAiRequest } from "@/models/AiRequest";
import Question from "@/models/Question";
import Chapter from "@/models/Chapter";
import "@/models/Book";
import {
  cleanupAiRequests,
  isRunner,
  NIGHT_AI_IMAGE_CAP,
  NIGHT_DRAFT_CAP,
  NIGHT_PAPER_CAP,
  NIGHT_SHEET_CAP,
  papersLast24h,
  RUNNER_LOCK_MS,
  sheetsLast24h,
  usedLast24h,
} from "@/lib/aiRequests";
import type { TCheckInput, TPaperInput } from "@/models/AiRequest";
import Book from "@/models/Book";
import { TAG } from "@/data/const";
import mongoose from "mongoose";
import Paper from "@/models/Paper";
import User from "@/models/User";
import Batch from "@/models/Batch";

/**
 * Nightly runner: claim the oldest queued request (or one whose earlier run
 * died: lock expired) and get everything needed to work on it in one call.
 * Returns { request: null } when there is nothing to do or the night's cap is
 * used up. Auth: x-ai-runner-key (AI_RUNNER_KEY), never a staff session.
 * ?type=check claims answer-sheet checks (their own skill); anything else
 * claims "variants", so each skill only ever sees its own kind of work.
 */
export const GET = async (req: NextRequest) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  try {
    await dbConnect();
    await cleanupAiRequests();
    if (req.nextUrl.searchParams.get("type") === "check") return claimCheck();
    if (req.nextUrl.searchParams.get("type") === "paper") return claimPaper();
    const used = await usedLast24h();
    const caps = {
      draftsLeft: Math.max(0, NIGHT_DRAFT_CAP - used.drafts),
      aiImagesLeft: Math.max(0, NIGHT_AI_IMAGE_CAP - used.aiImages),
    };
    if (!caps.draftsLeft) return nextSuccess({ request: null, caps, reason: "Tonight's cap is used up" });

    const now = new Date();
    const request = await AiRequest.findOneAndUpdate(
      {
        type: "variants",
        $or: [
          { status: "queued" },
          { status: "running", lockedUntil: { $lt: now } },
        ],
      },
      { $set: { status: "running", claimedAt: now, lockedUntil: new Date(Date.now() + RUNNER_LOCK_MS) } },
      { sort: { createdAt: 1 }, new: true }
    )
      .select("-drafts.text -drafts.ans")
      .lean<TAiRequest>();
    if (!request) return nextSuccess({ request: null, caps, reason: "Nothing queued" });

    const chapter = await Chapter.findById(request.target.chapter)
      .populate({ path: "book", select: "title subject course" })
      .select("title book")
      .lean<any>();
    const sources = request.input.questionIds?.length
      ? await Question.find({ _id: { $in: request.input.questionIds } })
          .select("text ans mark tags")
          .lean()
      : [];
    // Existing questions of the chapter (start of the text only), to avoid
    // writing near-duplicates of what the bank already has
    const existing = await Question.find({ chapter: request.target.chapter })
      .select("text")
      .sort({ _id: -1 })
      .limit(400)
      .lean<{ text: string }[]>();

    return nextSuccess({
      request,
      // Drafts already uploaded by an earlier, interrupted run of this request
      alreadyMade: request.drafts?.length ?? 0,
      chapter: {
        title: chapter?.title,
        book: chapter?.book?.title,
        subject: chapter?.book?.subject,
        course: chapter?.book?.course,
      },
      sources,
      existingStarts: existing.map((q) => (q.text || "").slice(0, 160)),
      caps,
    });
  } catch (err) {
    return nextError(err);
  }
};

/** Claim the oldest queued "check" and send everything its skill needs. */
async function claimCheck() {
  const caps = { sheetsLeft: Math.max(0, NIGHT_SHEET_CAP - (await sheetsLast24h())) };
  if (!caps.sheetsLeft) return nextSuccess({ request: null, caps, reason: "Tonight's cap is used up" });
  const now = new Date();
  const request = await AiRequest.findOneAndUpdate(
    { type: "check", $or: [{ status: "queued" }, { status: "running", lockedUntil: { $lt: now } }] },
    { $set: { status: "running", claimedAt: now, lockedUntil: new Date(Date.now() + RUNNER_LOCK_MS) } },
    { sort: { createdAt: 1 }, new: true }
  )
    .select("type title status input checked.student rubric createdAt")
    .lean<TAiRequest>();
  if (!request) return nextSuccess({ request: null, caps, reason: "Nothing queued" });

  const input = request.input as unknown as TCheckInput;
  const [paper, students, batch] = await Promise.all([
    Paper.findById(input.paper)
      .select("title course questions")
      .populate({ path: "questions", select: "text ans mark tags chapter", populate: { path: "chapter", select: "title subject" } })
      .lean<any>(),
    User.find({ _id: { $in: input.sheets.map((s) => s.student) } }).select("name").lean<{ _id: unknown; name: string }[]>(),
    Batch.findById(input.batch).select("name").lean<{ name: string }>(),
  ]);
  const names = new Map(students.map((u) => [String(u._id), u.name]));
  const done = new Set((request.checked ?? []).map((c) => String(c.student)));
  return nextSuccess({
    request: { _id: request._id, type: request.type, title: request.title, rubric: request.rubric ?? [] },
    test: { name: input.name, subject: input.subject, date: input.date, language: input.language, instructions: input.instructions, batch: batch?.name },
    paper: paper && {
      title: paper.title,
      course: paper.course,
      questions: (paper.questions ?? []).map((q: any, i: number) => ({
        n: i + 1,
        _id: String(q._id),
        mark: Number(q.mark) || 1,
        chapter: q.chapter?.title,
        tags: q.tags ?? [],
        text: q.text,
        ans: q.ans,
      })),
    },
    // Sheets still to mark (an interrupted run already posted the others)
    sheets: input.sheets
      .filter((s) => !done.has(s.student))
      .map((s) => ({ student: s.student, name: names.get(s.student) ?? "Student", pages: s.pages })),
    alreadyChecked: done.size,
    caps,
  });
}

/**
 * Claim the oldest queued "paper" and send the map of the bank it can use:
 * every chapter of the course's books for the chosen subjects, with how many
 * questions it has, how many are tagged Numerical, and the mark spread. The
 * skill then searches (runner/questions) and saves (runner/[id]/paper).
 */
async function claimPaper() {
  const caps = { papersLeft: Math.max(0, NIGHT_PAPER_CAP - (await papersLast24h())) };
  if (!caps.papersLeft) return nextSuccess({ request: null, caps, reason: "Tonight's cap is used up" });
  const now = new Date();
  const request = await AiRequest.findOneAndUpdate(
    { type: "paper", $or: [{ status: "queued" }, { status: "running", lockedUntil: { $lt: now } }] },
    { $set: { status: "running", claimedAt: now, lockedUntil: new Date(Date.now() + RUNNER_LOCK_MS) } },
    { sort: { createdAt: 1 }, new: true }
  )
    .select("type title status input result createdBy createdAt")
    .lean<TAiRequest>();
  if (!request) return nextSuccess({ request: null, caps, reason: "Nothing queued" });

  const input = request.input as unknown as TPaperInput;
  const books = await Book.find({ course: input.course, subject: { $in: input.subjects } }).select("title subject").lean<{ _id: unknown; title: string; subject: string }[]>();
  const chapters = await Chapter.find({ book: { $in: books.map((b) => b._id) } })
    .select("title subject book")
    .lean<{ _id: mongoose.Types.ObjectId; title: string; subject: string; book: unknown }[]>();
  const counts = await Question.aggregate([
    { $match: { chapter: { $in: chapters.map((c) => c._id) } } },
    {
      $group: {
        _id: "$chapter",
        total: { $sum: 1 },
        numerical: { $sum: { $cond: [{ $in: [TAG.NUMERICAL, { $ifNull: ["$tags", []] }] }, 1, 0] } },
        marks: { $push: { $ifNull: ["$mark", 1] } },
      },
    },
  ]);
  const byChapter = new Map(counts.map((c) => [String(c._id), c]));
  const bookName = new Map(books.map((b) => [String(b._id), b.title]));
  return nextSuccess({
    request: { _id: request._id, type: request.type, title: request.title, input, createdBy: request.createdBy, result: request.result ?? null },
    chapters: chapters
      .map((c) => {
        const n = byChapter.get(String(c._id));
        const spread: Record<string, number> = {};
        for (const m of n?.marks ?? []) spread[m] = (spread[m] ?? 0) + 1;
        return { _id: String(c._id), title: c.title, subject: c.subject, book: bookName.get(String(c.book)), total: n?.total ?? 0, numerical: n?.numerical ?? 0, marks: spread };
      })
      .filter((c) => c.total > 0),
    caps,
  });
}
