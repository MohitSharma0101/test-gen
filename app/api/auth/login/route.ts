import { dbConnect } from "@/lib/dbUtils";
import Account, { TAccount } from "@/models/Account";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { generateToken } from "@/lib/tokenUtils";
import { setSessionCookie } from "@/lib/session";

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return nextError("Username and password are required.", 400);
    }

    await dbConnect();

    // One message for an unknown username and a wrong password, so the
    // reply doesn't reveal which usernames exist.
    const account = (await Account.findOne({ username })) as TAccount | null;
    const isPasswordMatch = account ? await bcrypt.compare(password, account.password) : false;
    if (!account || !isPasswordMatch) {
      return nextError("Wrong username or password.", 401);
    }

    const token = await generateToken(account);

    // The token travels only in the httpOnly cookie, never in the response body
    const res = nextSuccess(
      {
        account: {
          id: account._id,
          username: account.username,
          role: account.role,
        },
      },
      200
    );
    return setSessionCookie(res, token);
  } catch (err: any) {
    return nextError(err.message || "Something went wrong.", 500);
  }
};
