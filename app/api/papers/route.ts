import { dbConnect } from "@/lib/dbUtils";
import Paper, { TPaper } from "@/models/Paper";
import { NextRequest, NextResponse } from "next/server";
import '@/models/Chapter';
import '@/models/Question';

export const GET = async (request: NextRequest) => {
  try {
    await dbConnect();
    const papers = await Paper.find().populate({
      path: "questions",
      populate: {
        path: "chapter",
        model: "Chapter",
      },
    });

    return NextResponse.json(
      { status: "success", papers: papers },
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
    const { title, questions } = (await request.json()) as TPaper;

    if (!title || !questions || !questions.length) {
      return NextResponse.json(
        {
          status: "error",
          error: "All fields are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const questionsIds = questions.map((q) => q._id);

    const paper = new Paper({ title, questions: questionsIds });

    await paper.save();

    return NextResponse.json(
      { status: "success", question: paper },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          status: "error",
          error: "id is required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();
    await Paper.deleteOne({ _id: id });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
