import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<TUser>("User", UserSchema);