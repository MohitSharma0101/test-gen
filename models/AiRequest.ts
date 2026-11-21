import { Schema, model, models } from "mongoose";
import { MISTAKE_TYPES, type TMistakeType } from "./ExamResult";

// AI requests: work staff queue for Claude to do overnight (the nightly runner,
// see .claude/skills/generate-variants), then review here before anything
// touches the question bank. Generic by `type`:
// - "variants": write questions; drafts are reviewed, then added to the bank.
// - "check": mark offline answer sheets (page images) against a paper; results
//   are reviewed, then published as an Exam Result.
// - "paper": pick questions from the bank for a prompt; the result is a normal
//   Draft paper (papers collection) the teacher opens in Create Paper.
// A request is deleted once its work is uploaded/published, or after 30 days
// without review (lib/aiRequests.ts), so the collection stays small:
// ~1-2 KB per request plus ~3 KB per draft, or ~5-8 KB per checked sheet.
export const AI_REQUEST_TYPES = ["variants", "check", "paper"] as const;
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

export const CHECK_LANGUAGES = ["hinglish", "english", "hindi"] as const;
export type TCheckLanguage = (typeof CHECK_LANGUAGES)[number];

/** "check": one student's answer sheet, as page images (uploaded from PDFs or photos). */
export type TCheckSheet = { student: string; pages: string[] };

export type TCheckInput = {
  paper: string;
  batch: string;
  name: string;
  subject: string;
  date: string;
  language: TCheckLanguage;
  instructions?: string;
  sheets: TCheckSheet[];
};

/** The runner's marking of one question for one student. */
export type TCheckedAnswerDraft = {
  question: string;
  answer?: string;
  marks: number;
  mistakeType?: TMistakeType;
  note?: string;
  // The two independent reads disagreed, or the writing was unclear: look first
  flagged?: boolean;
  // Page (0-based) where this answer is, for the review screen
  page?: number;
};

export type TCheckedSheet = {
  _id: string;
  student: string;
  answers: TCheckedAnswerDraft[];
  // Teacher changed something in review
  edited?: boolean;
  createdAt: string;
};

/** "paper": a paper made from the bank for a prompt (exam patterns live in the skill). */
export type TPaperInput = {
  // Short name, also the paper's title
  name: string;
  prompt: string;
  course: string;
  subjects: string[];
};

/** What a finished "paper" request made. */
export type TPaperResult = { paper: string; note?: string; questions?: number; marks?: number };

/** How each question is marked, written once and used for every student. */
export type TRubricItem = { question: string; points: string };

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
  // "variants" only
  target: { book: string; chapter: string };
  drafts: TAiDraft[];
  // "check" only (input is TCheckInput)
  checked?: TCheckedSheet[];
  rubric?: TRubricItem[];
  // "paper" only
  result?: TPaperResult;
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

const checkedSheetSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answers: {
      type: [
        {
          _id: false,
          question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
          answer: String,
          marks: { type: Number, required: true },
          mistakeType: { type: String, enum: MISTAKE_TYPES },
          note: String,
          flagged: Boolean,
          page: Number,
        },
      ],
      default: [],
    },
    edited: Boolean,
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
      required: false,
    },
    drafts: { type: [draftSchema], default: [] },
    checked: { type: [checkedSheetSchema], default: undefined },
    rubric: { type: [{ _id: false, question: { type: Schema.Types.ObjectId, ref: "Question" }, points: String }], default: undefined },
    result: {
      type: { _id: false, paper: { type: Schema.Types.ObjectId, ref: "Paper" }, note: String, questions: Number, marks: Number },
      default: undefined,
    },
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
