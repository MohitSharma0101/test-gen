import jwt from "jsonwebtoken";
import Account, { TAccount } from "@/models/Account";
import { cookies, headers } from "next/headers";
import { dbConnect } from "./dbUtils";
import { AUTH_TOKEN_KEY } from "./api";

type TGetAccountProps = {
  includePassword?: boolean;
};

export const getAccount = async ({
  includePassword,
}: TGetAccountProps = {}) => {
  try {
    const cookieStore = cookies();
    const authorization = headers().get("authorization");

    const token =
      cookieStore.get(AUTH_TOKEN_KEY)?.value || authorization?.split(" ")[1];
    if (!token) {
      return null;
    }

    const accountFromToken = jwt.verify(
      token,
      process.env.AUTH_SECRET as string
    ) as TAccount;

    if (!accountFromToken) return null;

    await dbConnect();

    const accountObj = (await Account.findById(
      accountFromToken.id
    )) as TAccount;

    if (!accountObj) return null;

    const res = {
      _id: accountObj._id.toString(),
      username: accountObj.username,
      role: accountObj.role,
    } as TAccount;

    if (includePassword) {
      res.password = accountObj.password;
    }

    return res;
  } catch (err) {
    return null;
  }
};

export const generateToken = (account: Partial<TAccount>) => {
  return jwt.sign(
    {
      id: account._id,
      username: account.username,
      role: account.role,
    },
    process.env.AUTH_SECRET as string,
    { expiresIn: "24h" }
  );
};
