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
  RUNNER_LOCK_MS,
  usedLast24h,
} from "@/lib/aiRequests";

/**
 * Nightly runner: claim the oldest queued request (or one whose earlier run
 * died: lock expired) and get everything needed to work on it in one call.
 * Returns { request: null } when there is nothing to do or the night's cap is
 * used up. Auth: x-ai-runner-key (AI_RUNNER_KEY), never a staff session.
 */
export const GET = async (req: NextRequest) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  try {
    await dbConnect();
    await cleanupAiRequests();
    const used = await usedLast24h();
    const caps = {
      draftsLeft: Math.max(0, NIGHT_DRAFT_CAP - used.drafts),
      aiImagesLeft: Math.max(0, NIGHT_AI_IMAGE_CAP - used.aiImages),
    };
    if (!caps.draftsLeft) return nextSuccess({ request: null, caps, reason: "Tonight's cap is used up" });

    const now = new Date();
    const request = await AiRequest.findOneAndUpdate(
      {
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
