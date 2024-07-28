import mongoose, { Document, Schema } from "mongoose";

type TUser = Document & {
  name: string;
  email: string;
  password: string;
  roles: string[];
};

const UserSchema: Schema<TUser> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: String, enum: ["user", "admin"], default: "user" }],
});

const User = mongoose.models.User || mongoose.model<TUser>("User", UserSchema);

export default User;
export type { TUser };
