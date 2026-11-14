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


// Indexes for the hot queries. Books of a class + subject.
// Mongoose creates them on first use (autoIndex); existing ones are a no-op.
BookSchema.index({ course: 1, subject: 1 });

export default mongoose.models.Book || mongoose.model("Book", BookSchema);
