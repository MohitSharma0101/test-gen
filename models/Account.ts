import { Schema, model, models, Document } from "mongoose";

export enum Role {
  TEACHER = "teacher",
  ADMIN = "admin",
}

export type TAccount = Document & {
  _id: string;
  username: string;
  password: string;
  role: Role;
};

const AccountSchema = new Schema<TAccount>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(Role),
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent model overwrite during hot-reload in dev
const Account = models.Account || model<TAccount>("Account", AccountSchema);

export default Account;
