import mongoose, { Document, Schema } from "mongoose";
import { TUserRole, USER_ROLES } from "./UserRole";

type TUser = Document & {
  name: string;
  email: string;
  password: string;
  roles: TUserRole[];
};

const UserSchema: Schema<TUser> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: String, enum: USER_ROLES, default: "user" }],
});

const User = mongoose.models.User || mongoose.model<TUser>("User", UserSchema);

export default User;
export type { TUser };
