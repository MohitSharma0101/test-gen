import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getAccount } from "@/lib/auth";
import { Role } from "@/data/const";
import Suggestion from "@/models/Suggestion";
import { toChatMessages, TSuggestionDoc } from "@/lib/suggestionChat";

/** Same window as the student app loads. */
const CHAT_LIMIT = 150;
const MAX_CHARS = 2000;

type TParams = { params: { userId: string } };

const adminOrError = async () => {
  const account = await getAccount();
  if (!account) return { error: nextError("Please log in", 401) };
  if (account.role !== Role.ADMIN) return { error: nextError("Not found", 404) };
  return { account };
};

const studentId = (raw: string) =>
  Types.ObjectId.isValid(raw) ? new Types.ObjectId(raw) : null;

// One student's chat, oldest first.
export const GET = async (_req: NextRequest, { params }: TParams) => {
  const { error } = await adminOrError();
  if (error) return error;
  const userId = studentId(params.userId);
  if (!userId) return nextError("Unknown student", 400);
  try {
    await dbConnect();
    const docs = await Suggestion.find({ userId })
      .sort({ createdAt: -1 })
      .limit(CHAT_LIMIT)
      .select("from staffName name type message images context status reply replySeen createdAt")
      .lean();
    const name = docs.find((d) => d.name)?.name ?? "Student";
    // A bug report's device details, for the newest bug in view.
    const bug = docs.find((d) => d.type === "bug" && d.context);
    return nextSuccess({
      name,
      device: bug?.context ?? null,
      messages: toChatMessages(docs as unknown as TSuggestionDoc[]),
    });
  } catch (err) {
    return nextError(err);
  }
};

// A reply: its own message in the chat, unread in the student app until they
// open it. Replying also marks the student's messages read.
export const POST = async (request: NextRequest, { params }: TParams) => {
  const { error, account } = await adminOrError();
  if (error) return error;
  const userId = studentId(params.userId);
  if (!userId) return nextError("Unknown student", 400);
  try {
    const { message } = (await request.json()) as { message?: string };
    const text = (message ?? "").trim();
    if (!text) return nextError("Write a message first", 400);
    if (text.length > MAX_CHARS) return nextError(`Keep it under ${MAX_CHARS} characters`, 400);

    await dbConnect();
    const [doc] = await Promise.all([
      Suggestion.create({
        userId,
        from: "staff",
        staffName: account?.name ?? "",
        message: text,
        status: "done",
        replySeen: false,
      }),
      Suggestion.updateMany(
        { userId, from: { $ne: "staff" }, status: "new" },
        { $set: { status: "done" } }
      ),
    ]);
    return nextSuccess(toChatMessages([doc.toObject() as TSuggestionDoc])[0], 201);
  } catch (err) {
    return nextError(err);
  }
};

// Opening a chat marks the student's messages read.
export const PATCH = async (_req: NextRequest, { params }: TParams) => {
  const { error } = await adminOrError();
  if (error) return error;
  const userId = studentId(params.userId);
  if (!userId) return nextError("Unknown student", 400);
  try {
    await dbConnect();
    await Suggestion.updateMany(
      { userId, from: { $ne: "staff" }, status: "new" },
      { $set: { status: "done" } }
    );
    return nextSuccess(null);
  } catch (err) {
    return nextError(err);
  }
};
