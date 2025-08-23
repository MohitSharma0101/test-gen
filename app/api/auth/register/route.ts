import { dbConnect } from "@/lib/dbUtils";
import Account, { TAccount, Role } from "@/models/Account";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { username, password, role } = await request.json();

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
      role: Role.ADMIN,
    });

    await newAccount.save();

    return nextSuccess(
      {
        account: {
          id: newAccount._id,
          username: newAccount.username,
          role: newAccount.role,
        },
      },
      201
    );
  } catch (err: any) {
    return nextError(err.message || "Something went wrong.", 500);
  }
};
