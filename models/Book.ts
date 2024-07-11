import mongoose from "mongoose";

export type TBook = {
  _id: string;
  title: string;
};

export const BookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Book || mongoose.model("Book", BookSchema);
