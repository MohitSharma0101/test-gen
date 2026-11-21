import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest from "@/models/AiRequest";
import { checkPageUrls, deleteAiRequests, titleFor, validateInput } from "@/lib/aiRequests";
import { deleteAnswerSheetImages } from "@/lib/storage";
import Chapter from "@/models/Chapter";
import type { TAiRequest, TCheckInput } from "@/models/AiRequest";
import Paper from "@/models/Paper";
import { PaperStatus } from "@/data/const";
import User from "@/models/User";
import Batch from "@/models/Batch";
import "@/models/Chapter";
import "@/models/Book";

type Ctx = { params: { id: string } };
const badId = (id: string) => !mongoose.isValidObjectId(id);

// One request with its drafts, for the review screen.
export const GET = async (_req: NextRequest, { params }: Ctx) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (badId(params.id)) return nextError("Request not found", 404);
  try {
    await dbConnect();
    const request = await AiRequest.findById(params.id)
      .populate({ path: "target.chapter", select: "title course subject" })
      .populate({ path: "target.book", select: "title" })
      .lean<TAiRequest>();
    if (!request) return nextError("This request was finished and removed.", 404);
    if (request.type === "paper") {
      // The paper it made, if any: title and size for the result card
      const made = request.result?.paper
        ? await Paper.findById(request.result.paper).select("title status questions").lean<{ title: string; status: string; questions: unknown[] }>()
        : null;
      return nextSuccess({ request, madePaper: made && { _id: String(request.result!.paper), title: made.title, status: made.status, questions: made.questions.length } });
    }
    if (request.type !== "check") return nextSuccess({ request });

    // Review needs the paper's questions (with their solution) and the names
    const input = request.input as unknown as TCheckInput;
    const [paper, students, batch] = await Promise.all([
      Paper.findById(input.paper)
        .select("title questions")
        .populate({ path: "questions", select: "text ans mark chapter", populate: { path: "chapter", select: "title" } })
        .lean(),
      User.find({ _id: { $in: input.sheets.map((s) => s.student) } }).select("name").lean(),
      Batch.findById(input.batch).select("name").lean(),
    ]);
    return nextSuccess({ request, paper, students, batch });
  } catch (err) {
    return nextError(err);
  }
};

// Edit settings or cancel, only while queued (the runner hasn't started).
export const PATCH = async (req: NextRequest, { params }: Ctx) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (badId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json();
    await dbConnect();
    if (body?.action === "cancel") {
      const done = await AiRequest.findOneAndUpdate(
        { _id: params.id, status: "queued" },
        { $set: { status: "cancelled", finishedAt: new Date() } }
      );
      return done ? nextSuccess(null) : nextError("It has already started, so it can't be cancelled.", 409);
    }
    // Edit, or switch to another type: { type?, input, chapterId? }. Fields the
    // new type doesn't use are dropped; its own required ones must be sent.
    const current = await AiRequest.findOne({ _id: params.id, status: "queued" })
      .select("type input target")
      .lean<Pick<TAiRequest, "type" | "input" | "target">>();
    if (!current) return nextError("It has already started, so it can't be edited.", 409);
    const type = body?.type ?? current.type;
    if (type === "check") return nextError("To check answer sheets, use Check answer sheets: the sheets have to be uploaded there.", 400);
    const { input, expected, error } = validateInput(type, body?.input);
    if (error) return nextError(error, 400);

    const set: Record<string, unknown> = { type, input, expected, title: titleFor(type, input, expected!) };
    const unset: Record<string, 1> = { checked: 1, rubric: 1, result: 1 };
    if (type === "variants") {
      const chapterId = String(body?.chapterId ?? current.target?.chapter ?? "");
      if (!mongoose.isValidObjectId(chapterId)) return nextError("Choose the chapter", 400);
      const chapter = await Chapter.findById(chapterId).select("book").lean<{ book: unknown }>();
      if (!chapter) return nextError("Chapter not found", 404);
      set.target = { book: chapter.book, chapter: chapterId };
    } else unset.target = 1;

    // Leaving "check": its uploaded pages go
    if (current.type === "check" && type !== "check") await deleteAnswerSheetImages(checkPageUrls(current.input));
    const done = await AiRequest.findOneAndUpdate({ _id: params.id, status: "queued" }, { $set: set, $unset: unset });
    return done ? nextSuccess(null) : nextError("It has already started, so it can't be edited.", 409);
  } catch (err) {
    return nextError(err);
  }
};

// Delete. Not while Claude is working on it (it would just write back).
// ?discardPaper=1 (a "paper" request) also deletes the Draft paper it made.
export const DELETE = async (req: NextRequest, { params }: Ctx) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (badId(params.id)) return nextError("Request not found", 404);
  try {
    await dbConnect();
    if (req.nextUrl.searchParams.get("discardPaper") === "1") {
      const r = await AiRequest.findOne({ _id: params.id, type: "paper", status: { $ne: "running" } }).select("result.paper").lean<Pick<TAiRequest, "result">>();
      // Only a paper still in Draft: once the teacher has published it, it stays
      if (r?.result?.paper) await Paper.deleteOne({ _id: r.result.paper, status: PaperStatus.DRAFT });
    }
    const res = await deleteAiRequests({ _id: params.id, status: { $ne: "running" } });
    return res.deletedCount ? nextSuccess(null) : nextError("It's being generated right now. Try again later.", 409);
  } catch (err) {
    return nextError(err);
  }
};
