import mongoose from "mongoose";
import { TUser } from "./User";

// What the face recognition suggested, kept alongside what the teacher
// actually submitted. Comparing the two is how accuracy gets measured and how
// the confidence thresholds get set from real data rather than guesses.
export type TFaceAudit = {
  suggestedAbsent: string[];
  scores: { user: string; confidence: number }[];
  facesDetected: number;
  at: string;
};

export type TAttendance = {
  _id: string;
  batch: string;
  absentUsers: string[] | TUser[];
  date: string;
  faceAudit?: TFaceAudit;
  createdAt: string;
  updatedAt: string;
};

const AttendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    absentUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Absent unless the teacher used the photo flow. Not populated, since it
    // is read for analysis rather than display.
    faceAudit: {
      suggestedAbsent: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      scores: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          confidence: Number,
        },
      ],
      facesDetected: Number,
      at: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", AttendanceSchema);
