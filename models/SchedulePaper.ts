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
  // Only these students take it. Missing or empty = the whole batch (every
  // test scheduled before this existed). Always a subset of the batch.
  students?: string[];
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
    // Not set for whole-batch tests, so existing documents stay as they are
    students: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: undefined,
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
