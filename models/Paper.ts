import mongoose from "mongoose";
import { TQuestion } from "./Question";

export type TPaper = {
  id: string;
  _id: string;
  title: string;
  questions: TQuestion[];
  createdAt: string,
  updatedAt: string,
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
