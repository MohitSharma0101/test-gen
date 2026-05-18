import { dbConnect } from "@/lib/dbUtils";
import Account, { TAccount } from "@/models/Account";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { username, oldPassword, newPassword } = await request.json();

    if (!username || !oldPassword || !newPassword) {
      return nextError("Username, old password, and new password are required.", 400);
    }

    if (newPassword.length < 6) {
      return nextError("New password must be at least 6 characters long.", 400);
    }

    await dbConnect();

    const account = (await Account.findOne({ username })) as TAccount | null;
    if (!account) {
      return nextError("Account not found.", 404);
    }

    // Verify old password
    const isPasswordMatch = await bcrypt.compare(oldPassword, account.password);
    if (!isPasswordMatch) {
      return nextError("Invalid old password.", 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 11);

    // Update password
    const updatedAccount = await Account.findByIdAndUpdate(
      account._id,
      { password: hashedPassword },
      { new: true }
    ).lean<TAccount>();

    if (!updatedAccount) {
      return nextError("Failed to update password.", 500);
    }

    return nextSuccess(
      {
        message: "Password reset successfully.",
      },
      200
    );
  } catch (err: any) {
    return nextError(err.message || "Something went wrong.", 500);
  }
};

