import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { isRunner } from "@/lib/aiRequests";
import AiRequest from "@/models/AiRequest";

/** Runner: replace the note of a "paper" request that is running or waiting for review. { note } */
export const POST = async (req: NextRequest, { params }: { params: { id: string } }) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  if (!mongoose.isValidObjectId(params.id)) return nextError("Request not found", 404);
  try {
    const body = await req.json();
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 3000) : "";
    if (!note) return nextError("Give the note", 400);
    await dbConnect();
    const res = await AiRequest.updateOne(
      { _id: params.id, type: "paper", status: { $in: ["running", "review"] }, $or: [{ "result.paper": { $exists: true } }, { "drafts.0": { $exists: true } }] },
      { $set: { "result.note": note } }
    );
    return res.matchedCount ? nextSuccess(null) : nextError("No paper request with a paper here", 404);
  } catch (err) {
    return nextError(err);
  }
};
