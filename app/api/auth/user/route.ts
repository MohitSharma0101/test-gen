import { getUser } from "@/lib/auth";
import { dbConnect } from "@/lib/dbUtils";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { nextError } from "@/lib/nextUtils";

export const GET = async (request: NextRequest) => {
  try {
    await dbConnect();
    const user = await getUser();
    if (!user) return nextError("Invalid Token!", 403);

    return NextResponse.json(
      { status: "success", user: user },
      { status: 200 }
    );
  } catch (err: any) {
    return nextError();
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { name, email } = await request.json();
    const user = await getUser();
    if (!user) return nextError("Invalid Token!", 403);

    const newUserObj = {} as any;
    if (name) newUserObj.name = name;
    if (email) newUserObj.email = email;
    console.log("user._id", user)
    const newUser = await User.findByIdAndUpdate(user._id, newUserObj);

    return NextResponse.json(
      { status: "success", user: newUser },
      { status: 201 }
    );
  } catch (err: any) {
    return nextError();
  }
};
