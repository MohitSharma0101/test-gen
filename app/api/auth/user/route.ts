import { getUser } from "@/lib/auth";
import { dbConnect } from "@/lib/dbUtils";
import { nextError } from "@/lib/nextUtils";
import { NextRequest, NextResponse } from "next/server";

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
