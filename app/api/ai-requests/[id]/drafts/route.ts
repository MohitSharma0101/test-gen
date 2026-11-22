import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest, { type TPaperInput } from "@/models/AiRequest";
import Chapter from "@/models/Chapter";
import "@/models/Book";

type Ctx = { params: { id: string } };

/**
 * Review actions on drafts:
 * - { draftIds, status: "approved" | "rejected" | "pending" }
 * - { draftId, text?, ans? } to edit one draft (it stays in its status)
 * - { draftIds, chapter } a paper's written questions move to another chapter
 *   of the paper's course and subjects (where they'll be saved)
 * Uploaded drafts are final.
 */
export const PATCH = async (req: NextRequest, { params }: Ctx) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json();
    await dbConnect();

    if (Array.isArray(body?.draftIds) && body?.chapter !== undefined) {
      const chapter = String(body.chapter);
      if (!mongoose.isValidObjectId(chapter)) return nextError("Choose a chapter", 400);
      const request = await AiRequest.findOne({ _id: params.id, type: "paper", status: "review" }).select("input").lean<{ input: TPaperInput }>();
      if (!request) return nextError("This paper isn't waiting for review", 409);
      const ch = await Chapter.findById(chapter).populate({ path: "book", select: "course subject" }).select("book").lean<{ book?: { course: string; subject: string } }>();
      if (!ch?.book || ch.book.course !== request.input.course || !request.input.subjects.includes(ch.book.subject))
        return nextError(`Choose a chapter of ${request.input.course} ${request.input.subjects.join(" / ")}`, 400);
      const ids = body.draftIds.filter((id: string) => mongoose.isValidObjectId(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      await AiRequest.updateOne(
        { _id: params.id },
        { $set: { "drafts.$[d].chapter": new mongoose.Types.ObjectId(chapter), "drafts.$[d].chapterUnsure": false } },
        { arrayFilters: [{ "d._id": { $in: ids } }] }
      );
      return nextSuccess(null);
    }
    if (Array.isArray(body?.draftIds)) {
      if (!["approved", "rejected", "pending"].includes(body.status)) return nextError("Unknown status", 400);
      const ids = body.draftIds.filter((id: string) => mongoose.isValidObjectId(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      await AiRequest.updateOne(
        { _id: params.id },
        { $set: { "drafts.$[d].status": body.status } },
        { arrayFilters: [{ "d._id": { $in: ids }, "d.status": { $ne: "uploaded" } }] }
      );
      return nextSuccess(null);
    }

    if (body?.draftId && mongoose.isValidObjectId(body.draftId)) {
      const set: Record<string, string> = {};
      if (typeof body.text === "string" && body.text.trim()) set["drafts.$.text"] = body.text.trim();
      if (typeof body.ans === "string" && body.ans.trim()) set["drafts.$.ans"] = body.ans.trim();
      if (!Object.keys(set).length) return nextError("Nothing to save", 400);
      const res = await AiRequest.updateOne(
        { _id: params.id, drafts: { $elemMatch: { _id: body.draftId, status: { $ne: "uploaded" } } } },
        { $set: set }
      );
      return res.matchedCount ? nextSuccess(null) : nextError("That draft was already uploaded.", 409);
    }
    return nextError("Nothing to do", 400);
  } catch (err) {
    return nextError(err);
  }
};
