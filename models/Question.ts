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
  },
  { timestamps: true }
);

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
