import { NextRequest } from "next/server";
import "@/models/Chapter";
import "@/models/Question";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getUser } from "@/lib/auth";
import User, { TUser } from "@/models/User";

export const GET = async () => {
  try {
    const user = await getUser();
    if (!user || user.role != "admin") return nextError("Restricted!", 403);

    const users = await User.find({});

    return nextSuccess({ users: users });
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { id, name, email, role } = await request.json();
    const newUserObj = {} as TUser;
    if (name) newUserObj.name = name;
    if (email) newUserObj.email = email;
    if (role) newUserObj.role = role;
    const newUser = await User.findByIdAndUpdate(id, newUserObj);

    return nextSuccess({ user: newUser }, 201);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user || user.role != "admin") return nextError("Restricted!", 403);

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return nextError("user Id is required.");
    }

    await User.findByIdAndDelete(id);

    return nextSuccess({});
  } catch (err: any) {
    return nextError(err.message);
  }
};
