import { Schema, model, models } from "mongoose";

// A long-running background task (lib/jobs): re-marking all tests, and later
// imports, bulk sends, exports. One small document per run (~1-2 KB). No
// extra indexes: the collection stays tiny and is read by type, newest first.
export const JOB_STATUSES = ["queued", "running", "done", "failed", "cancelled"] as const;
export type TJobStatus = (typeof JOB_STATUSES)[number];

export type TJob = {
  _id: string;
  type: string;
  status: TJobStatus;
  options?: Record<string, unknown>;
  total: number;
  done: number;
  cursor?: string | null;
  // Times a run was claimed at the same cursor; a task that keeps getting
  // cut off by the function time limit is skipped after MAX_STALLS.
  stalls: number;
  failed: { key: string; error: string }[];
  error?: string;
  startedBy?: string;
  heartbeatAt?: string;
  lockedUntil?: string | null;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const jobSchema = new Schema(
  {
    type: { type: String, required: true },
    status: { type: String, enum: JOB_STATUSES, default: "queued" },
    options: { type: Schema.Types.Mixed, default: {} },
    total: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    cursor: { type: String, default: null },
    stalls: { type: Number, default: 0 },
    failed: { type: [{ _id: false, key: String, error: String }], default: [] },
    error: String,
    startedBy: String,
    heartbeatAt: Date,
    lockedUntil: { type: Date, default: null },
    finishedAt: Date,
  },
  { timestamps: true }
);

export default models.Job || model("Job", jobSchema);
