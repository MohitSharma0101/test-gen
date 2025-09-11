import mongoose from "mongoose";
import { TUser } from "./User";

export type TAttendance = {
  _id: string;
  batch: string;
  absentUsers: string[] | TUser[];
  date: string;
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
  },
  { timestamps: true }
);

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", AttendanceSchema);
