import { Role } from "@/data/const";
import { Schema, model, models } from "mongoose";

export type TAccount = {
  _id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  courses?: {
    course: string;
    subjects: string[];
  }[];
  coursesString?: string;
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
    name: {
      type: String,
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
    courses: [
      {
        course: {
          type: String,
          required: true,
        },
        subjects: [{ type: String, required: true }],
      },
    ],
  },
  { timestamps: true }
);

// Prevent model overwrite during hot-reload in dev
const Account = models.Account || model<TAccount>("Account", AccountSchema);

export default Account;
