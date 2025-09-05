import mongoose from "mongoose";
import { TUser } from "./User";

export type TBatch = {
  _id: string;
  name: string;
  fee: number;
  userIds: string[] | TUser[];
};

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    fee: {
      type: Number,
    },
    userIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Batch || mongoose.model("Batch", batchSchema);
