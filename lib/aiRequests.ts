import { NextRequest } from "next/server";
import mongoose from "mongoose";
import AiRequest, { TAiRequest, TVariantInput } from "@/models/AiRequest";

// Limits chosen with the user (Nov 2026)
export const NIGHT_DRAFT_CAP = 200; // drafts per 24 h, all requests together
export const NIGHT_AI_IMAGE_CAP = 50; // Workers AI images per 24 h
export const UNREVIEWED_DAYS = 30; // drafts nobody reviews are deleted after this
export const RUNNER_LOCK_MS = 3 * 60 * 60 * 1000; // a claim older than this is re-queued
export const MAX_SOURCE_QUESTIONS = 50;
export const MAX_TOPIC_QUESTIONS = 50;

/** The nightly runner authenticates with its own key, never a staff session. */
export const isRunner = (req: NextRequest) => {
  const key = process.env.AI_RUNNER_KEY;
  return !!key && req.headers.get("x-ai-runner-key") === key;
};

/** Validate a "variants" request from the form. Returns cleaned input or an error. */
export function validateVariantInput(raw: any): { input?: TVariantInput; expected?: number; error?: string } {
  const mode = raw?.mode === "topic" ? "topic" : raw?.mode === "similar" ? "similar" : null;
  if (!mode) return { error: "Choose how to make the questions" };
  const difficulty = ["same", "easier", "harder"].includes(raw?.difficulty) ? raw.difficulty : "same";
  const questionType = ["same", "MCQ", "NUMERICAL"].includes(raw?.questionType) ? raw.questionType : "same";
  const instructions = typeof raw?.instructions === "string" ? raw.instructions.trim().slice(0, 1000) : "";
  const count = Math.floor(Number(raw?.count));

  if (mode === "similar") {
    const ids = Array.from(new Set((Array.isArray(raw?.questionIds) ? raw.questionIds : []).map(String)));
    if (!ids.length) return { error: "Choose at least one question" };
    if (ids.length > MAX_SOURCE_QUESTIONS) return { error: `Choose at most ${MAX_SOURCE_QUESTIONS} questions` };
    if (ids.some((id) => !mongoose.isValidObjectId(id))) return { error: "Invalid question" };
    if (!(count >= 1 && count <= 4)) return { error: "Choose 1 to 4 variants per question" };
    return {
      input: { mode, questionIds: ids as string[], count, difficulty, questionType, instructions },
      expected: ids.length * count,
    };
  }
  const topic = typeof raw?.topic === "string" ? raw.topic.trim().slice(0, 300) : "";
  if (!topic) return { error: "Describe the topic" };
  if (!(count >= 1 && count <= MAX_TOPIC_QUESTIONS)) return { error: `Choose 1 to ${MAX_TOPIC_QUESTIONS} questions` };
  return {
    input: { mode, topic, count, difficulty, questionType: questionType === "same" ? "MCQ" : questionType, instructions },
    expected: count,
  };
}

/**
 * Housekeeping, run whenever the list is read: a request whose drafts are all
 * done (uploaded or rejected) is deleted, and so is one that sat in review
 * untouched for UNREVIEWED_DAYS. No TTL index needed (the user asked to keep
 * indexes out); the collection holds a handful of documents.
 */
export async function cleanupAiRequests() {
  const cutoff = new Date(Date.now() - UNREVIEWED_DAYS * 86_400_000);
  await AiRequest.deleteMany({
    $or: [
      { status: { $in: ["review", "failed", "cancelled"] }, updatedAt: { $lt: cutoff } },
      {
        status: "review",
        "drafts.0": { $exists: true },
        drafts: { $not: { $elemMatch: { status: { $in: ["pending", "approved"] } } } },
      },
    ],
  });
}

/** Counts per draft status, without sending the drafts. */
export const summaryProjection = {
  type: 1,
  title: 1,
  status: 1,
  input: 1,
  target: 1,
  expected: 1,
  createdBy: 1,
  error: 1,
  createdAt: 1,
  updatedAt: 1,
  finishedAt: 1,
  counts: {
    total: { $size: "$drafts" },
    pending: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "pending"] } } } },
    approved: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "approved"] } } } },
    rejected: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "rejected"] } } } },
    uploaded: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "uploaded"] } } } },
  },
};

export type TAiRequestSummary = Omit<TAiRequest, "drafts"> & {
  counts: { total: number; pending: number; approved: number; rejected: number; uploaded: number };
  chapterTitle?: string;
  bookTitle?: string;
};

/** Drafts (and AI images) made in the last 24 hours, for the nightly caps. */
export async function usedLast24h() {
  const since = new Date(Date.now() - 86_400_000);
  const [row] = await AiRequest.aggregate([
    { $unwind: "$drafts" },
    { $match: { "drafts.createdAt": { $gte: since } } },
    {
      $group: {
        _id: null,
        drafts: { $sum: 1 },
        aiImages: { $sum: { $cond: [{ $eq: ["$drafts.diagram.kind", "ai-image"] }, 1, 0] } },
      },
    },
  ]);
  return { drafts: row?.drafts ?? 0, aiImages: row?.aiImages ?? 0 };
}
