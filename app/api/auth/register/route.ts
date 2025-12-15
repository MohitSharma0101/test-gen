import { dbConnect } from "@/lib/dbUtils";
import Account, { TAccount } from "@/models/Account";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { Role } from "@/data/const";
import { getSafeAccount } from "@/lib/utils";

export const POST = async (request: NextRequest) => {
  try {
    const { username, password, role, courses, name } = await request.json();

    if (!username || !password) {
      return nextError("All fields are required.", 400);
    }

    await dbConnect();

    // Check if username already exists
    const existingAccount = (await Account.findOne({
      username,
    })) as TAccount | null;
    if (existingAccount) {
      return nextError("Username already taken.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 11);

    const newAccount = new Account({
      username,
      password: hashedPassword,
      name: name || username,
      role: role || Role.TEACHER,
      courses: courses || [],
    } as TAccount);

    await newAccount.save();

    return nextSuccess(
      {
        account: getSafeAccount(newAccount),
      },
      201
    );
  } catch (err: any) {
    return nextError(err.message || "Something went wrong.", 500);
  }
};
