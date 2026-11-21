import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest from "@/models/AiRequest";
import Chapter from "@/models/Chapter";
import { checkTitle, cleanupAiRequests, requestTitle, summaryProjection, validateCheckInput, validatePaperInput, validateVariantInput } from "@/lib/aiRequests";
import Paper from "@/models/Paper";
import Batch from "@/models/Batch";
import User from "@/models/User";

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
      // "check" keeps its batch id as a string in input
      {
        $lookup: {
          from: "batches",
          let: { b: "$input.batch" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", { $convert: { input: "$$b", to: "objectId", onError: null, onNull: null } }] } } },
            { $project: { name: 1 } },
          ],
          as: "bt",
        },
      },
      { $addFields: { chapterTitle: { $first: "$ch.title" }, bookTitle: { $first: "$bk.title" }, batchName: { $first: "$bt.name" } } },
      { $project: { ch: 0, bk: 0, bt: 0 } },
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
    if (body?.type === "check") return createCheck(body, account.name || account.username);
    if (body?.type === "paper") {
      const { input, error } = validatePaperInput(body.input);
      if (error || !input) return nextError(error ?? "Invalid request", 400);
      await dbConnect();
      const doc = await AiRequest.create({ type: "paper", title: input.name, input, expected: 1, createdBy: account.name || account.username });
      return nextSuccess({ request: { _id: String(doc._id) } }, 201);
    }
    if (body?.type !== "variants") return nextError("Unknown request type", 400);
    const { input, expected, error } = validateVariantInput(body.input);
    if (error) return nextError(error, 400);
    const chapterId = String(body?.chapterId ?? "");
    if (!mongoose.isValidObjectId(chapterId)) return nextError("Choose the chapter for the new questions", 400);

    await dbConnect();
    const chapter = await Chapter.findById(chapterId).select("title book").lean<{ title: string; book: unknown }>();
    if (!chapter) return nextError("Chapter not found", 404);

    const title = requestTitle(input!, expected!);
    const doc = await AiRequest.create({
      type: "variants",
      title,
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

// "check": answer sheets (already uploaded as page images) of one batch, to be
// marked against one paper. Only students of that batch can be in it.
async function createCheck(body: any, createdBy?: string) {
  const { input, error } = validateCheckInput(body?.input);
  if (error || !input) return nextError(error ?? "Invalid request", 400);
  await dbConnect();
  const [paper, batch, students] = await Promise.all([
    Paper.findById(input.paper).select("questions").lean<{ questions: unknown[] }>(),
    Batch.exists({ _id: input.batch }),
    User.find({ _id: { $in: input.sheets.map((s) => s.student) }, batchIds: input.batch }).select("_id").lean<{ _id: unknown }[]>(),
  ]);
  if (!paper) return nextError("Paper not found", 404);
  if (!paper.questions?.length) return nextError("This paper has no questions", 400);
  if (!batch) return nextError("Batch not found", 404);
  const inBatch = new Set(students.map((u) => String(u._id)));
  const outside = input.sheets.filter((s) => !inBatch.has(s.student)).length;
  if (outside) return nextError(`${outside} answer sheet${outside === 1 ? " is" : "s are"} for students not in this batch`, 400);

  const doc = await AiRequest.create({
    type: "check",
    title: checkTitle(input),
    input,
    expected: input.sheets.length,
    checked: [],
    createdBy,
  });
  return nextSuccess({ request: { _id: String(doc._id) } }, 201);
}
