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
  faceEnrolledAt?: string;
  faceSignatureCount?: number;
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
    // Counters only. The signatures themselves are in FaceSignature so this
    // document stays light for list queries.
    faceEnrolledAt: {
      type: Date,
    },
    faceSignatureCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


// Indexes for the hot queries. Students of a batch by name (attendance, fees, messages); all students by name.
// Mongoose creates them on first use (autoIndex); existing ones are a no-op.
UserSchema.index({ batchIds: 1, name: 1 });
UserSchema.index({ name: 1 });

export default mongoose.models.User ||
  mongoose.model<TUser>("User", UserSchema);
