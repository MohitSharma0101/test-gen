import mongoose, { Schema, model, models } from "mongoose";
import { TBatch } from "./Batch";
import { TPaper } from "./Paper";

export type TSchedulePaper = {
  _id: string;
  paper: TPaper;
  duration: number;
  startTime: string;
  endTime: string;
  batch?: TBatch;
};

const SchedulePaperSchema = new Schema<TSchedulePaper>(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
      required: true,
    },
    duration: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: false,
    },
  },
  { timestamps: true }
);

// Indexes for the hot queries. Online tests of a batch, newest first.
// Mongoose creates them on first use (autoIndex); existing ones are a no-op.
SchedulePaperSchema.index({ batch: 1, createdAt: -1 });

const SchedulePaper =
  models.SchedulePaper ||
  model<TSchedulePaper>("SchedulePaper", SchedulePaperSchema);

export default SchedulePaper;
