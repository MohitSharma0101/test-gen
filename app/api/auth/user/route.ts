import { getUser } from "@/lib/auth";
import User, { TUser } from "@/models/User";
import { NextRequest } from "next/server";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const GET = async () => {
  try {
    const user = await getUser();
    if (!user) return nextError("Invalid Token!", 403);

    return nextSuccess({ user: user }, 201);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { name, email, role } = await request.json();
    const user = await getUser();
    if (!user) return nextError("Invalid Token!", 403);

    const newUserObj = {} as TUser;
    if (name) newUserObj.name = name;
    if (email) newUserObj.email = email;
    if (role) newUserObj.roles = [role];
    const newUser = await User.findByIdAndUpdate(user._id, newUserObj);

    return nextSuccess({ user: newUser }, 201);
  } catch (err: any) {
    return nextError(err.message);
  }
};
