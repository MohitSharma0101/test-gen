import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import Suggestion, { SUGGESTION_TYPES, TSuggestionType } from "@/models/Suggestion";

const PAGE_SIZE = 30;

const requireAdmin = async () => {
  const account = await getAccount();
  if (!account) return nextError("Please log in", 401);
  if (account.role !== Role.ADMIN) return nextError("Not found", 404);
  return null;
};

// The inbox: newest first, filtered by type and status, plus the new count.
export const GET = async (request: NextRequest) => {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const params = request.nextUrl.searchParams;
    const type = params.get("type") as TSuggestionType | null;
    const status = params.get("status");
    const page = Math.max(1, Number(params.get("page")) || 1);

    const filter: Record<string, unknown> = {};
    if (type && SUGGESTION_TYPES.includes(type)) filter.type = type;
    if (status === "new" || status === "done") filter.status = status;

    await dbConnect();
    const [items, total, newCount] = await Promise.all([
      Suggestion.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Suggestion.countDocuments(filter),
      Suggestion.countDocuments({ status: "new" }),
    ]);
    return nextSuccess({ items, total, newCount, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
  } catch (err) {
    return nextError(err);
  }
};

// Reply and/or mark done. A new reply shows as unread in the student app.
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
