// list all accounts
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { getSafeAccount } from "@/lib/utils";
import Account, { TAccount } from "@/models/Account";
import { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    await dbConnect();
    const accounts = await Account.find().lean<TAccount[]>();

    const safeAccounts = accounts.map((a) => getSafeAccount(a));

    return nextSuccess({ accounts: safeAccounts });
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { accountId, name, role, courses } = body;

    if (!accountId) {
      return nextError("Account ID is required");
    }

    await dbConnect();

    const accountUpdate: Partial<TAccount> = {};

    if (name) accountUpdate.name = name;
    if (role) accountUpdate.role = role;
    if (courses) accountUpdate.courses = courses;

    const updatedAccount = await Account.findByIdAndUpdate(accountId, accountUpdate, {
      new: true, // return updated doc
    }).lean<TAccount>();

    if (!updatedAccount) {
      return nextError("Account not found");
    }

    const safeAccount = getSafeAccount(updatedAccount);

    return nextSuccess({
      message: "Account updated successfully",
      account: safeAccount,
    });
  } catch (err: any) {
    return nextError(err.message || "Failed to update account");
  }
};
