import mongoose from "mongoose";

export type TBook = {
  _id: string;
  title: string;
  course: "8" | "9" | "10" | "11" | "12" | "JEE" | "NEET";
  subject: string;
};

export const BookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Book || mongoose.model("Book", BookSchema);
