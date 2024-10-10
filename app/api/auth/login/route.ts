import { dbConnect } from "@/lib/dbUtils";
import User, { TUser } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { nextError } from "@/lib/nextUtils";
import jwt from "jsonwebtoken";

export const POST = async (request: NextRequest) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return nextError("All fields are required.");
    }

    await dbConnect();
    const user = (await User.findOne({ email: email })) as TUser;
    if (!user) {
      return nextError("User not found.");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return nextError("Wrong Password.");
    }

    const token = jwt.sign(
      { email: user.email, role: user.role, id: user._id },
      process.env.AUTH_SECRET as string,
      {
        expiresIn: "1h",
      }
    );

    return NextResponse.json(
      {
        status: "success",
        token: token,
        user: {
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return nextError(err.message);
  }
};
