import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { AI_TOPIC_MAX, COURSES, SUBJECT_MAP } from "@/data/const";
import AiRequest, { CHECK_LANGUAGES, TAiRequest, TAiRequestType, TCheckInput, TCheckLanguage, TPaperInput, TVariantInput } from "@/models/AiRequest";
import { deleteAnswerSheetImages } from "@/lib/storage";

// Limits chosen with the user (Nov 2026)
export const NIGHT_DRAFT_CAP = 200; // drafts per 24 h, all requests together
export const NIGHT_AI_IMAGE_CAP = 50; // Workers AI images per 24 h
export const UNREVIEWED_DAYS = 30; // drafts nobody reviews are deleted after this
export const RUNNER_LOCK_MS = 3 * 60 * 60 * 1000; // a claim older than this is re-queued
export const MAX_SOURCE_QUESTIONS = 50;
export const MAX_TOPIC_QUESTIONS = 50;
// "check": answer sheets marked per 24 h (each is ~2 reads of every page), and
// per-request limits that keep one request inside a night and the document small
export const NIGHT_SHEET_CAP = 80;
export const MAX_SHEETS = 80;
export const MAX_PAGES_PER_SHEET = 20;
// "paper": papers made per 24 h
export const NIGHT_PAPER_CAP = 10;
export const PAPER_PROMPT_MAX = 2000;

/** The nightly runner authenticates with its own key, never a staff session. */
export const isRunner = (req: NextRequest) => {
  const key = process.env.AI_RUNNER_KEY;
  return !!key && req.headers.get("x-ai-runner-key") === key;
};

/**
 * The request's name in lists, from its settings (kept in step when a queued
 * request is edited). The topic is short (AI_TOPIC_MAX), so it is used as is.
 */
export const requestTitle = (input: TVariantInput, expected: number) =>
  input.mode === "topic"
    ? `${input.count} questions · ${input.topic}`
    : `${expected} variants of ${input.questionIds!.length} question${input.questionIds!.length === 1 ? "" : "s"}`;

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
  const topic = typeof raw?.topic === "string" ? raw.topic.trim() : "";
  if (!topic) return { error: "Describe the topic" };
  if (topic.length > AI_TOPIC_MAX) return { error: `Keep the topic under ${AI_TOPIC_MAX} characters. Put the details in the prompt.` };
  if (!(count >= 1 && count <= MAX_TOPIC_QUESTIONS)) return { error: `Choose 1 to ${MAX_TOPIC_QUESTIONS} questions` };
  return {
    input: { mode, topic, count, difficulty, questionType: questionType === "same" ? "MCQ" : questionType, instructions },
    expected: count,
  };
}

/**
 * Validate a "check" request's shape (the route then checks that the paper,
 * batch and students exist). Sheets without pages are dropped.
 */
export function validateCheckInput(raw: any): { input?: TCheckInput; error?: string } {
  const id = (v: unknown) => (typeof v === "string" && mongoose.isValidObjectId(v) ? v : "");
  const paper = id(raw?.paper);
  const batch = id(raw?.batch);
  if (!paper) return { error: "Choose the paper" };
  if (!batch) return { error: "Choose the batch" };
  const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, 120) : "";
  if (!name) return { error: "Give the test a name" };
  const subject = typeof raw?.subject === "string" ? raw.subject.trim().slice(0, 60) : "";
  if (!subject) return { error: "Choose the subject" };
  const date = typeof raw?.date === "string" && !Number.isNaN(Date.parse(raw.date)) ? raw.date : "";
  if (!date) return { error: "Choose the test date" };
  const language: TCheckLanguage = CHECK_LANGUAGES.includes(raw?.language) ? raw.language : "hinglish";
  const instructions = typeof raw?.instructions === "string" ? raw.instructions.trim().slice(0, 1000) : "";
  const seen = new Set<string>();
  const sheets = (Array.isArray(raw?.sheets) ? raw.sheets : [])
    .map((s: any) => ({
      student: id(s?.student),
      pages: (Array.isArray(s?.pages) ? s.pages : []).filter((u: unknown) => typeof u === "string" && /^https:\/\//.test(u)),
    }))
    .filter((s: { student: string; pages: string[] }) => s.student && s.pages.length && !seen.has(s.student) && seen.add(s.student));
  if (!sheets.length) return { error: "Add at least one answer sheet" };
  if (sheets.length > MAX_SHEETS) return { error: `At most ${MAX_SHEETS} answer sheets in one request` };
  if (sheets.some((s: { pages: string[] }) => s.pages.length > MAX_PAGES_PER_SHEET))
    return { error: `At most ${MAX_PAGES_PER_SHEET} pages per answer sheet` };
  return { input: { paper, batch, name, subject, date, language, instructions, sheets } };
}

/** Validate a "paper" request: a name (also the paper's title), the prompt, the course and its subjects. */
export function validatePaperInput(raw: any): { input?: TPaperInput; error?: string } {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  if (name.length < 3) return { error: "Give the paper a name" };
  if (name.length > AI_TOPIC_MAX) return { error: `Keep the name under ${AI_TOPIC_MAX} characters. Put the details in the prompt.` };
  const prompt = typeof raw?.prompt === "string" ? raw.prompt.trim().slice(0, PAPER_PROMPT_MAX) : "";
  if (prompt.length < 10) return { error: "Describe the paper you want in the prompt" };
  const course = typeof raw?.course === "string" && COURSES.includes(raw.course) ? raw.course : "";
  if (!course) return { error: "Choose the course" };
  const allowed: string[] = SUBJECT_MAP[course] ?? [];
  const subjects = Array.from(new Set<string>((Array.isArray(raw?.subjects) ? raw.subjects : []).filter((x: unknown) => typeof x === "string" && allowed.includes(x))));
  if (!subjects.length) return { error: "Choose at least one subject" };
  return { input: { name, prompt, course, subjects } };
}

/**
 * Any type's input, validated by its own rules: one entry point for creating
 * a request and for switching a queued request to another type.
 */
export function validateInput(type: unknown, raw: unknown): { type?: TAiRequestType; input?: unknown; expected?: number; error?: string } {
  if (type === "variants") {
    const r = validateVariantInput(raw);
    return r.error ? { error: r.error } : { type, input: r.input, expected: r.expected };
  }
  if (type === "check") {
    const r = validateCheckInput(raw);
    return r.error ? { error: r.error } : { type, input: r.input, expected: r.input!.sheets.length };
  }
  if (type === "paper") {
    const r = validatePaperInput(raw);
    return r.error ? { error: r.error } : { type, input: r.input, expected: 1 };
  }
  return { error: "Unknown request type" };
}

/** The list name of any request. */
export const titleFor = (type: TAiRequestType, input: unknown, expected: number) =>
  type === "check" ? checkTitle(input as TCheckInput) : type === "paper" ? (input as TPaperInput).name : requestTitle(input as TVariantInput, expected);

/** Papers made in the last 24 hours, for NIGHT_PAPER_CAP. */
export async function papersLast24h() {
  const since = new Date(Date.now() - 86_400_000);
  return AiRequest.countDocuments({ type: "paper", "result.paper": { $exists: true }, finishedAt: { $gte: since } });
}

/** Every page image a "check" request holds, for clean-up. */
export const checkPageUrls = (input: unknown) =>
  ((input as TCheckInput | undefined)?.sheets ?? []).flatMap((s) => s.pages ?? []);

/** Delete requests (and, for "check", their page images). */
export async function deleteAiRequests(filter: Record<string, any>) {
  const checks = await AiRequest.find({ ...filter, type: "check" }).select("input.sheets").lean<{ input: TCheckInput }[]>();
  const urls = checks.flatMap((r) => checkPageUrls(r.input));
  if (urls.length) await deleteAnswerSheetImages(urls);
  return AiRequest.deleteMany(filter);
}

/**
 * Housekeeping, run whenever the list is read: a request whose drafts are all
 * done (uploaded or rejected) is deleted, and so is one that sat in review
 * untouched for UNREVIEWED_DAYS. No TTL index needed (the user asked to keep
 * indexes out); the collection holds a handful of documents.
 */
export async function cleanupAiRequests() {
  const cutoff = new Date(Date.now() - UNREVIEWED_DAYS * 86_400_000);
  await deleteAiRequests({
    $or: [
      { status: { $in: ["review", "failed", "cancelled"] }, updatedAt: { $lt: cutoff } },
      {
        type: { $ne: "check" },
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
  // A "check" input carries every page URL (~100 KB for a big batch): the list
  // gets only its labels
  input: {
    $cond: [
      { $eq: ["$type", "check"] },
      { paper: "$input.paper", batch: "$input.batch", name: "$input.name", subject: "$input.subject", date: "$input.date", language: "$input.language" },
      "$input",
    ],
  },
  target: 1,
  expected: 1,
  createdBy: 1,
  error: 1,
  createdAt: 1,
  updatedAt: 1,
  finishedAt: 1,
  // "check": sheets marked so far (the input itself, with page URLs, is trimmed below)
  checkedCount: { $size: { $ifNull: ["$checked", []] } },
  sheetCount: { $size: { $ifNull: ["$input.sheets", []] } },
  counts: {
    total: { $size: "$drafts" },
    pending: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "pending"] } } } },
    approved: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "approved"] } } } },
    rejected: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "rejected"] } } } },
    uploaded: { $size: { $filter: { input: "$drafts", cond: { $eq: ["$$this.status", "uploaded"] } } } },
  },
};

export type TAiRequestSummary = Omit<TAiRequest, "drafts" | "checked"> & {
  checkedCount: number;
  sheetCount: number;
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

/** Answer sheets marked in the last 24 hours, for NIGHT_SHEET_CAP. */
export async function sheetsLast24h() {
  const since = new Date(Date.now() - 86_400_000);
  const [row] = await AiRequest.aggregate([
    { $match: { type: "check", "checked.createdAt": { $gte: since } } },
    { $unwind: "$checked" },
    { $match: { "checked.createdAt": { $gte: since } } },
    { $count: "n" },
  ]);
  return row?.n ?? 0;
}

/** The list name of a "check" request. */
export const checkTitle = (input: TCheckInput) =>
  `${input.name} · ${input.sheets.length} answer sheet${input.sheets.length === 1 ? "" : "s"}`;
