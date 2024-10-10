import jwt from "jsonwebtoken";
import User, { TUser } from "@/models/User";
import { cookies, headers } from "next/headers";
import { dbConnect } from "./dbUtils";
import { AUTH_TOKEN_KEY } from "./api";

type TGetUserProps = {
  includePassword?: boolean;
};

export const getUser = async ({ includePassword }: TGetUserProps = {}) => {
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

  await dbConnect();

  const userObj = (await User.findOne({ _id: userFromToken.id })) as TUser;

  const res = {
    _id: userObj?._id?.toString(),
    email: userObj.email,
    name: userObj.name,
    role: userObj.role,
  } as TUser;
  if (includePassword) {
    res.password = userObj.password;
  }
  return res;
};

export const generateToken = (user: Partial<TUser>) => {
  return jwt.sign(
    { email: user.email, roles: user.role, id: user._id },
    process.env.AUTH_SECRET as string,
    {
      expiresIn: "24h",
    }
  );
};
