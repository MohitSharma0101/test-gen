import mongoose from "mongoose";
import { QuestionSchema, TQuestion } from "./Question";

export type TPaper = {
  _id: string;
  title: string;
  questions: TQuestion[]
};

export const PaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Paper || mongoose.model("Paper", PaperSchema);
