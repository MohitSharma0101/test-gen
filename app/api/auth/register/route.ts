import { dbConnect } from "@/lib/dbUtils";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { nextError } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { name, email, password, confirmPassword } = await request.json();

    if (!name || !email || !password) {
      return nextError("All fields are required.");
    }

    if (password !== confirmPassword) {
      return nextError("Confirm password doesn't match.");
    }

    await dbConnect();
    const encryptedPassword = await bcrypt.hash(password, 11);

    const newUser = new User({ name, email, password: encryptedPassword });
    await newUser.save();

    return NextResponse.json(
      { status: "success", user: newUser },
      { status: 201 }
    );
  } catch (err: any) {
    return nextError();
  }
};
