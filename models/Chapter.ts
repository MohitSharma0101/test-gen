import mongoose from "mongoose";

export type TChapter = {
  _id: string;
  course: "8" | "9" | "10" | "11" | "12" | "JEE" | "NEET";
  subject: string;
  title: string;
};

export const ChapterSchema = new mongoose.Schema(
  {
    course: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Chapter ||
  mongoose.model("Chapter", ChapterSchema);
