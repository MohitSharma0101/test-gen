import { Schema, model, models, Types } from "mongoose";

import { MISTAKE_TYPES } from "@/data/const";
export { MISTAKE_TYPES };
export type TMistakeType = (typeof MISTAKE_TYPES)[number];

// One question of a checked answer sheet (offline tests checked by the AI
// runner, see ai-requests "check"). Only results made that way have these.
export type TCheckedAnswer = {
  question: string;
  // Short summary of what the student wrote
  answer?: string;
  marks: number;
  mistakeType?: TMistakeType;
  // Where marks were lost, in the request's language; only when marks were cut
  note?: string;
};

export type TStudentResult = {
  userId: string;
  marks: number;
  answers?: TCheckedAnswer[];
};

export type TExamResult = {
  _id: string;
  name: string;
  batchId: string;
  subject: string;
  date: string;
  totalMarks: number;
  // The paper the answer sheets were checked against (checked results only)
  paper?: string;
  results: TStudentResult[];
  createdAt: Date;
  updatedAt: Date;
};

const StudentResultSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    marks: { type: Number, required: true },
    // ~150-300 bytes per answer; only on results checked by the AI runner
    answers: {
      type: [
        {
          _id: false,
          question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
          answer: String,
          marks: { type: Number, required: true },
          mistakeType: { type: String, enum: MISTAKE_TYPES },
          note: String,
        },
      ],
      default: undefined,
    },
  },
  { _id: false }
);

const ExamResultSchema = new Schema(
  {
    name: { type: String, required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    subject: {
      type: String,
      required: true,
    },
    date: { type: Date, required: true },
    totalMarks: { type: Number, required: true },
    paper: { type: Schema.Types.ObjectId, ref: "Paper" },
    results: { type: [StudentResultSchema], default: [] },
  },
  { timestamps: true }
);

// Indexes for the hot queries. Results of a batch, newest first.
// Mongoose creates them on first use (autoIndex); existing ones are a no-op.
ExamResultSchema.index({ batchId: 1, date: -1 });

// Prevent model overwrite during hot-reload in dev
const ExamResult =
  models.ExamResult || model<TExamResult>("ExamResult", ExamResultSchema);

export default ExamResult;
