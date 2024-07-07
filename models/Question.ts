
import mongoose from "mongoose";

export type TQuestion = {
  _id?: string;
  text?: string;
  ans?: string;
  chapter?: string;
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
  },
  { timestamps: true }
);

export default mongoose.models.Question ||
  mongoose.model("Question", QuestionSchema);
