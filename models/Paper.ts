import mongoose from "mongoose";
import { TQuestion } from "./Question";
import { PaperStatus } from "@/data/const";

export type TPaper = {
  id: string;
  _id: string;
  title: string;
  author: string;
  questions: TQuestion[];
  course?: string;
  status?: PaperStatus;
  createdAt: string;
  updatedAt: string;
};

export const PaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: false,
    },
    course: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: PaperStatus,
      default: PaperStatus.PUBLIC
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Paper || mongoose.model("Paper", PaperSchema);
