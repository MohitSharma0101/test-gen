import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Question, { TQuestion } from "@/models/Question";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chapter = searchParams.get("chapter");

    const query: any = {};
    if (chapter) query.chapter = chapter;
    
    await dbConnect();
    const questions = await Question.find(query).populate("chapter", {
      subject: 1,
      course: 1,
      title: 1,
    });

    return NextResponse.json(
      { status: "success", questions: questions },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const { ans, chapter, text } = (await request.json()) as TQuestion;

    if (!ans || !chapter || !text) {
      return NextResponse.json(
        {
          status: "error",
          error: "All fields are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const newQuestion = new Question({ ans, chapter, text });

    await newQuestion.save();

    return NextResponse.json(
      { status: "success", question: newQuestion },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
