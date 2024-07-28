import jwt from "jsonwebtoken";
import User, { TUser } from "@/models/User";
import { cookies, headers } from "next/headers";
import { dbConnect } from "./dbUtils";
import { AUTH_TOKEN_KEY } from "./api";

let user: TUser | null = null;

export const getUser = async () => {
  const cookieStore = cookies();
  const authorization = headers().get("authorization");

  const token =
    cookieStore.get(AUTH_TOKEN_KEY)?.value || authorization?.split(" ")[1];
  if (!token) {
    return null;
  }
  const userFromToken = jwt.verify(
    token,
    process.env.AUTH_SECRET as string
  ) as TUser;
  if (!userFromToken) return null;

  if (!user || !userFromToken) {
    await dbConnect();

    const userObj = (await User.findOne({ _id: userFromToken.id })) as TUser;
    console.log("userObj: ", userObj);

    user = {
      email: userObj.email,
      name: userObj.name,
      roles: userObj.roles,
    } as TUser;
  }
  return user;
};
