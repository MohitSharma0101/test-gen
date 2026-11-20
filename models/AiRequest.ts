import { Schema, model, models } from "mongoose";

// AI requests: work staff queue for Claude to do overnight (the nightly runner,
// see .claude/skills/generate-variants), then review here before anything
// touches the question bank. Generic by `type`; "variants" is the only type
// so far. A request is deleted once its approved drafts are uploaded, or after
// 30 days without review (lib/aiRequests.ts), so the collection stays small:
// ~1-2 KB per request plus ~3 KB per draft while it waits.
export const AI_REQUEST_TYPES = ["variants"] as const;
export type TAiRequestType = (typeof AI_REQUEST_TYPES)[number];

export const AI_REQUEST_STATUSES = ["queued", "running", "review", "failed", "cancelled"] as const;
export type TAiRequestStatus = (typeof AI_REQUEST_STATUSES)[number];

export const DRAFT_STATUSES = ["pending", "approved", "rejected", "uploaded"] as const;
export type TDraftStatus = (typeof DRAFT_STATUSES)[number];

export type TVariantInput = {
  mode: "similar" | "topic";
  // similar: the source questions
  questionIds?: string[];
  // topic: what to write about
  topic?: string;
  // similar: variants per question (1-4); topic: questions in total (1-50)
  count: number;
  difficulty: "same" | "easier" | "harder";
  questionType: "same" | "MCQ" | "NUMERICAL";
  instructions?: string;
};

export type TAiDraft = {
  _id: string;
  // Mathpix Markdown, same shape as a question: options as \textbf{(a)}…
  text: string;
  // First line the answer ("(b\)" or a number), then the solution
  ans: string;
  questionType: "MCQ" | "NUMERICAL";
  mark?: number;
  sourceQuestion?: string;
  diagram?: { kind: "svg" | "ai-image"; url: string };
  checks: {
    // An independent solve, without seeing the key, gave the same answer
    keyMatch: boolean;
    renderOk: boolean;
    notes?: string;
  };
  status: TDraftStatus;
  createdAt: string;
};

export type TAiRequest = {
  _id: string;
  type: TAiRequestType;
  title: string;
  status: TAiRequestStatus;
  input: TVariantInput;
  target: { book: string; chapter: string };
  drafts: TAiDraft[];
  // Drafts the runner planned to make, for the progress bar
  expected: number;
  createdBy?: string;
  claimedAt?: string;
  lockedUntil?: string | null;
  error?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const draftSchema = new Schema(
  {
    text: { type: String, required: true },
    ans: { type: String, required: true },
    questionType: { type: String, enum: ["MCQ", "NUMERICAL"], required: true },
    mark: Number,
    sourceQuestion: { type: Schema.Types.ObjectId, ref: "Question" },
    diagram: { type: { _id: false, kind: String, url: String }, default: undefined },
    checks: {
      type: { _id: false, keyMatch: Boolean, renderOk: Boolean, notes: String },
      default: { keyMatch: false, renderOk: false },
    },
    status: { type: String, enum: DRAFT_STATUSES, default: "pending" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const aiRequestSchema = new Schema(
  {
    type: { type: String, enum: AI_REQUEST_TYPES, required: true },
    title: { type: String, required: true },
    status: { type: String, enum: AI_REQUEST_STATUSES, default: "queued" },
    input: { type: Schema.Types.Mixed, required: true },
    target: {
      type: {
        _id: false,
        book: { type: Schema.Types.ObjectId, ref: "Book" },
        chapter: { type: Schema.Types.ObjectId, ref: "Chapter" },
      },
      required: true,
    },
    drafts: { type: [draftSchema], default: [] },
    expected: { type: Number, default: 0 },
    createdBy: String,
    claimedAt: Date,
    lockedUntil: { type: Date, default: null },
    error: String,
    finishedAt: Date,
  },
  { timestamps: true }
);

export default models.AiRequest || model("AiRequest", aiRequestSchema);
