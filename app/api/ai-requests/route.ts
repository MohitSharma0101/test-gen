import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest from "@/models/AiRequest";
import Chapter from "@/models/Chapter";
import { cleanupAiRequests, summaryProjection, validateVariantInput } from "@/lib/aiRequests";

// The list: newest first, with draft counts (never the drafts themselves).
export const GET = async () => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  try {
    await dbConnect();
    await cleanupAiRequests();
    const requests = await AiRequest.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      { $project: summaryProjection },
      { $lookup: { from: "chapters", localField: "target.chapter", foreignField: "_id", as: "ch", pipeline: [{ $project: { title: 1 } }] } },
      { $lookup: { from: "books", localField: "target.book", foreignField: "_id", as: "bk", pipeline: [{ $project: { title: 1 } }] } },
      { $addFields: { chapterTitle: { $first: "$ch.title" }, bookTitle: { $first: "$bk.title" } } },
      { $project: { ch: 0, bk: 0 } },
    ]);
    return nextSuccess({ requests });
  } catch (err) {
    return nextError(err);
  }
};

// Queue a request. The target chapter decides where approved questions go.
export const POST = async (req: NextRequest) => {
  const account = await getAccount();
  if (!account) return nextError("Please sign in again.", 401);
  try {
    const body = await req.json();
    if (body?.type !== "variants") return nextError("Unknown request type", 400);
    const { input, expected, error } = validateVariantInput(body.input);
    if (error) return nextError(error, 400);
    const chapterId = String(body?.chapterId ?? "");
    if (!mongoose.isValidObjectId(chapterId)) return nextError("Choose the chapter for the new questions", 400);

    await dbConnect();
    const chapter = await Chapter.findById(chapterId).select("title book").lean<{ title: string; book: unknown }>();
    if (!chapter) return nextError("Chapter not found", 404);

    const title =
      input!.mode === "topic"
        ? `${input!.count} questions · ${input!.topic}`
        : `${expected} variants of ${input!.questionIds!.length} question${input!.questionIds!.length === 1 ? "" : "s"}`;
    const doc = await AiRequest.create({
      type: "variants",
      title: title.slice(0, 140),
      input,
      expected,
      target: { book: chapter.book, chapter: chapterId },
      createdBy: account.name || account.username,
    });
    return nextSuccess({ request: { _id: String(doc._id) } }, 201);
  } catch (err) {
    return nextError(err);
  }
};
