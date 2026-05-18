import mongoose from "mongoose";

export type TBatch = {
  _id: string;
  name: string;
  fee: number;
  archived?: boolean;
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
    archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Batch || mongoose.model("Batch", batchSchema);
