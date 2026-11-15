import mongoose from "mongoose";
import { TChapter } from "./Chapter";

export type TQuestion = {
  id?: string;
  _id?: string;
  text?: string;
  ans?: string;
  chapter?: string | TChapter;
  mark?: number;
  timesUsed?: number;
  index?: number;
  tags?: string[];
  // Measured from online-test answer sheets (lib/questionStats.ts)
  stats?: TQuestionStats;
};

export type TQuestionStats = {
  attempts: number; // answered (right or wrong) in online tests
  correct: number;
  correctRate: number; // 0–1
  avgTime: number; // seconds per attempt
  // Top-third students' accuracy minus bottom-third's, per test. Negative =
  // weaker students do better: usually a wrong answer key or a misleading
  // question. null until each group has enough attempts.
  discrimination: number | null;
  updatedAt: string;
};

export type SubjectQuestions = {
  subject: string;
  questions: TQuestion[];
};

export const QuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    ans: {
      type: String,
      required: true,
    },
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    mark: {
      type: Number,
      required: false,
      default: 1,
    },
    tags: [{
      type: String,
      required: false,
    }],
    timesUsed: {
      type: Number,
      required: false,
      default: 0,
    },
    stats: {
      attempts: Number,
      correct: Number,
      correctRate: Number,
      avgTime: Number,
      discrimination: { type: Number, default: null },
      updatedAt: Date,
    },
  },
  { timestamps: true }
);


// Indexes for the hot queries. Question list per chapter, newest first (also serves the generator's chapter $in).
// Mongoose creates them on first use (autoIndex); existing ones are a no-op.
QuestionSchema.index({ chapter: 1, createdAt: -1, _id: -1 });

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
