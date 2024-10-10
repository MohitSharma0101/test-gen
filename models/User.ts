import mongoose, { Document, Schema } from "mongoose";
import { TUserRole } from "./UserRole";

type TUser = Document & {
  name: string;
  email: string;
  password: string;
  role: TUserRole;
  createdAt: string,
  updatedAt: string,
};

const UserSchema: Schema<TUser> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model<TUser>("User", UserSchema);

export default User;
export type { TUser };
