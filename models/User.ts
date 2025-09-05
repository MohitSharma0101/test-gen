import mongoose from "mongoose";
import { TBatch } from "./Batch";
import { TFeeSummary } from "./FeeSummary";

export type TUser = {
  _id: string;
  name: string;
  phone: string;
  userId: string;
  email?: string;
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  school?: string;
  createdAt?: string;
  updatedAt?: string;
  dob?: string;
  batchIds?: (string | TBatch)[];
  feeSummary?: TFeeSummary | string;
};

export type TUserWithFeeSummary = Omit<TUser, "feeSummary" | "batchIds"> & {
  batchIds: TBatch[];
  feeSummary: TFeeSummary & {
    due: number;
    paid: number;
    totalFee: number;
  };
};

export const UserSchema = new mongoose.Schema<TUser>(
  {
    userId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    fatherName: {
      type: String,
    },
    motherName: {
      type: String,
    },
    parentPhone: {
      type: String,
    },
    school: {
      type: String,
    },
    dob: {
      type: String,
    },
    batchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
      },
    ],
    feeSummary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeSummary",
    },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<TUser>("User", UserSchema);
