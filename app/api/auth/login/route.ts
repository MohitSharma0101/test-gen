import { dbConnect } from "@/lib/dbUtils";
import Account, { TAccount } from "@/models/Account";
import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import jwt from "jsonwebtoken";
import { generateToken } from "@/lib/auth";

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return nextError("Username and password are required.", 400);
    }

    await dbConnect();

    const account = (await Account.findOne({ username })) as TAccount | null;
    if (!account) {
      return nextError("Account not found.", 404);
    }

    const isPasswordMatch = await bcrypt.compare(password, account.password);
    if (!isPasswordMatch) {
      return nextError("Invalid credentials.", 401);
    }

    const token = generateToken(account);

    return nextSuccess(
      {
        token,
        account: {
          id: account._id,
          username: account.username,
          role: account.role,
        },
      },
      200
    );
  } catch (err: any) {
    return nextError(err.message || "Something went wrong.", 500);
  }
};
