import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import AiRequest from "@/models/AiRequest";
import { isRunner } from "@/lib/aiRequests";

/**
 * Nightly runner: done with a request. { requeue: true } puts it back for the
 * next night (cap reached mid-way); otherwise it goes to review, or to failed
 * with { error } when nothing usable was made.
 */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const { requeue, error } = (await req.json().catch(() => ({}))) as { requeue?: boolean; error?: string };
    await dbConnect();
    const request = await AiRequest.findOne({ _id: params.id, status: "running" }).select("drafts._id checked._id result.paper").lean<{ drafts: unknown[]; checked?: unknown[]; result?: { paper?: unknown } }>();
    if (!request) return nextError("This request isn't claimed by the runner", 409);
    const status = requeue ? "queued" : request.drafts.length || request.checked?.length || request.result?.paper ? "review" : "failed";
    await AiRequest.updateOne(
      { _id: params.id },
      {
        $set: {
          status,
          lockedUntil: null,
          ...(status !== "queued" ? { finishedAt: new Date() } : {}),
          ...(error ? { error: String(error).slice(0, 500) } : {}),
        },
      }
    );
    return nextSuccess({ status });
  } catch (err) {
    return nextError(err);
  }
};
