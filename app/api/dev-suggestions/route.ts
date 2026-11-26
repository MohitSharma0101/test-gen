import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import Suggestion, { TSuggestionType } from "@/models/Suggestion";

/** Chats shown in the list: far more students than ever write in. */
const THREAD_LIMIT = 200;

const requireAdmin = async () => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);
  if (account.role !== Role.ADMIN) return nextError("Not found", 404);
  return null;
};

export type TThread = {
  userId: string;
  name: string;
  lastMessage: string;
  lastFrom: "student" | "staff";
  lastType?: TSuggestionType;
  lastAt: string;
  /** The student's messages not yet read here. */
  unread: number;
};

// One row per student who has written in, latest conversation first, with
// how many of their messages are unread. Grouped in the database, newest
// message first, so each row carries its chat's latest message.
export const GET = async () => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await dbConnect();
    const rows = await Suggestion.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          // Staff messages carry no student name; take it from theirs.
          name: { $max: "$name" },
          lastMessage: { $first: "$message" },
          lastFrom: { $first: { $ifNull: ["$from", "student"] } },
          lastType: { $first: "$type" },
          lastAt: { $first: "$createdAt" },
          unread: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$from", "staff"] }, { $eq: ["$status", "new"] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: THREAD_LIMIT },
    ]);
    const threads: TThread[] = rows.map((r) => ({
      userId: String(r._id),
      name: r.name || "Student",
      lastMessage: r.lastMessage,
      lastFrom: r.lastFrom,
      lastType: r.lastType ?? undefined,
      lastAt: new Date(r.lastAt).toISOString(),
      unread: r.unread,
    }));
    const unread = threads.reduce((n, t) => n + t.unread, 0);
    return nextSuccess({ threads, unread });
  } catch (err) {
    return nextError(err);
  }
};

// Older inbox: reply and/or mark one suggestion done. The chat replies
// through dev-suggestions/[userId]; this stays for anything still calling it.
export const PATCH = async (request: NextRequest) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id, reply, status } = (await request.json()) as {
      id?: string;
      reply?: string;
      status?: "new" | "done";
    };
    if (!id || !Types.ObjectId.isValid(id)) return nextError("Missing message id", 400);

    const set: Record<string, unknown> = {};
    if (typeof reply === "string") {
      const text = reply.trim();
      set.reply = text ? { text: text.slice(0, 2000), at: new Date() } : null;
      set.replySeen = false;
      if (text) set.status = "done";
    }
    if (status === "new" || status === "done") set.status = status;
    if (!Object.keys(set).length) return nextError("Nothing to update", 400);

    await dbConnect();
    const doc = await Suggestion.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!doc) return nextError("Message not found", 404);
    return nextSuccess(doc);
  } catch (err) {
    return nextError(err);
  }
};

// Empties the "suggestions/" folder on Cloudinary, including images a student
// picked and then removed before sending (the student app uploads on pick),
// then drops the links from every message. The message text stays.
// The Admin API deletes up to 1000 per call and says "partial" while more remain.
const clearSuggestionFolder = async () => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error("Cloudinary is not configured");
  const auth = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
  let deleted = 0;
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload?prefix=${encodeURIComponent("suggestions/")}`,
      { method: "DELETE", headers: { Authorization: auth } }
    );
    if (!res.ok) throw new Error(`Cloudinary refused the delete (${res.status})`);
    const body = (await res.json()) as { deleted?: Record<string, string>; partial?: boolean };
    deleted += Object.values(body.deleted ?? {}).filter((v) => v === "deleted").length;
    if (!body.partial) break;
  }
  return deleted;
};

export const POST = async () => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const cleared = await clearSuggestionFolder();
    await dbConnect();
    await Suggestion.updateMany({ "images.0": { $exists: true } }, { $set: { images: [] } });
    return nextSuccess({ cleared });
  } catch (err) {
    return nextError(err);
  }
};
