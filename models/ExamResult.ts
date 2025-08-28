import { Schema, model, models, Types } from "mongoose";

export type TStudentResult = {
  userId: string;
  marks: number;
};

export type TExamResult = {
  _id: string;
  name: string;
  batchId: string;
  subject: string;
  date: string;
  totalMarks: number;
  results: TStudentResult[];
  createdAt: Date;
  updatedAt: Date;
};

const StudentResultSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    marks: { type: Number, required: true },
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
    results: { type: [StudentResultSchema], default: [] },
  },
  { timestamps: true }
);

// Prevent model overwrite during hot-reload in dev
const ExamResult =
  models.ExamResult || model<TExamResult>("ExamResult", ExamResultSchema);

export default ExamResult;
