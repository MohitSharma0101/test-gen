import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import AiRequest from "@/models/AiRequest";
import { validateVariantInput } from "@/lib/aiRequests";
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
      .lean();
    return request ? nextSuccess({ request }) : nextError("This request was finished and removed.", 404);
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
    const { input, expected, error } = validateVariantInput(body?.input);
    if (error) return nextError(error, 400);
    const done = await AiRequest.findOneAndUpdate({ _id: params.id, status: "queued" }, { $set: { input, expected } });
    return done ? nextSuccess(null) : nextError("It has already started, so it can't be edited.", 409);
  } catch (err) {
    return nextError(err);
  }
};

// Delete. Not while Claude is working on it (it would just write back).
export const DELETE = async (_req: NextRequest, { params }: Ctx) => {
  if (!(await getAccount())) return nextError("Please sign in again.", 401);
  if (badId(params.id)) return nextError("Request not found", 404);
  try {
    await dbConnect();
    const res = await AiRequest.deleteOne({ _id: params.id, status: { $ne: "running" } });
    return res.deletedCount ? nextSuccess(null) : nextError("It's being generated right now. Try again later.", 409);
  } catch (err) {
    return nextError(err);
  }
};
