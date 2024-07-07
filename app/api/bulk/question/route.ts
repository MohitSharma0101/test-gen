import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Question from "@/models/Question";

export const POST = async (request: NextRequest) => {
  try {
    const { questions } = await request.json();

    if (!questions || questions?.length <= 0) {
      return NextResponse.json(
        {
          status: "error",
          error: "All fields are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    await Question.insertMany(questions);

    return NextResponse.json({ status: "success" }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
