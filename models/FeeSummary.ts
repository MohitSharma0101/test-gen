import mongoose from "mongoose";

export type TFeeSummary = {
  _id: string;
  studentId: string;
  totalPaid: number;
  payments: {
    date: string;
    amount: number;
    mode?: string;
    note?: string;
  }[];
};

const FeeSummarySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  totalPaid: {
    type: Number,
    default: 0,
  },
  payments: [
    {
      date: { type: String },
      amount: { type: Number, required: true },
      mode: { type: String },
    },
  ],
});

export default mongoose.models.FeeSummary ||
  mongoose.model<TFeeSummary>("FeeSummary", FeeSummarySchema);
