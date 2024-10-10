import { generateToken, getUser } from "@/lib/auth";
import User, { TUser } from "@/models/User";
import { NextRequest } from "next/server";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import bcrypt from "bcrypt";

export const PUT = async (request: NextRequest) => {
  try {
    const user = await getUser({ includePassword: true });
    if (!user) return nextError("Invalid Token!", 403);

    const { currentPassword, newPassword, confirmNewPassword } =
      await request.json();

    if (!currentPassword || !newPassword || !confirmNewPassword)
      return nextError("All fields are required!");
    if (newPassword !== confirmNewPassword)
      return nextError("Password doesn't match with confirm password!");

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) return nextError("Incorrect password!");

    const hashedNewPassword = await bcrypt.hash(newPassword, 11);

    const newUser = await User.findByIdAndUpdate<TUser>(user._id, {
      password: hashedNewPassword,
    });
    if (!newUser) return nextError();
    const token = generateToken(newUser);

    return nextSuccess({
      user: {
        _id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
      token: token,
    });
  } catch (err: any) {
    return nextError(err.message);
  }
};
