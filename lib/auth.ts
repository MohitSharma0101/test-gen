import { cache } from "react";
import Account, { TAccount } from "@/models/Account";
import { cookies, headers } from "next/headers";
import { dbConnect } from "./dbUtils";
import { AUTH_TOKEN_KEY } from "./api";
import { verifyToken } from "./tokenUtils";
import { getSafeAccount } from "./utils";

type TGetAccountProps = {
  includePassword?: boolean;
};

// One JWT verify and one DB read per request, however many server components
// ask (the (root) layout and a page both do). React's cache() is scoped to a
// single request, so nothing leaks between users. Outside a server render
// (route handlers) it simply calls through.
export const getAccount = ({ includePassword }: TGetAccountProps = {}) =>
  readAccount(Boolean(includePassword));

const readAccount = cache(async (includePassword: boolean) => {
  try {
    const cookieStore = cookies();
    const authorization = headers().get("authorization");

    const token = cookieStore.get(AUTH_TOKEN_KEY)?.value || authorization?.split(" ")[1];
    if (!token) {
      return null;
    }

    const accountFromToken = await verifyToken(token);
    if (!accountFromToken) return null;

    await dbConnect();

    const accountObj = (await Account.findById(accountFromToken.id)) as TAccount;

    if (!accountObj) return null;

    const res = getSafeAccount(accountObj, true);

    if (includePassword) {
      res.password = accountObj.password;
    }

    return res;
  } catch (err) {
    return null;
  }
});
