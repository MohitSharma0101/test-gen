import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Chapter, { TChapter } from "@/models/Chapter";
import Question from "@/models/Question";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const course = searchParams.get("course");
    const subject = searchParams.get("subject");
    const book = searchParams.get("book");

    const query: any = {};
    if (course) query.course = course;
    if (subject) query.subject = subject;
    if (book) query.book = book;

    await dbConnect();
    const chapters = await Chapter.find(query).sort({ order: 1 });

    return NextResponse.json(
      { status: "success", chapters: chapters },
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
    const { course, subject, title, book, order } =
      (await request.json()) as TChapter;

    if (!course || !subject || !title || !book) {
      return NextResponse.json(
        {
          status: "error",
          error: "All fields are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const newChapter = new Chapter({ course, subject, title, book, order });

    await newChapter.save();

    return NextResponse.json(
      { status: "success", chapter: newChapter },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { id, title, order } = await request.json();

    if (!id || !title) {
      return NextResponse.json(
        {
          status: "error",
          error: "All fields are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const chapterObj: any = { title: title };
    if (order) {
      chapterObj.order = order;
    }

    const newChapter = await Chapter.findByIdAndUpdate(id, chapterObj);

    return NextResponse.json(
      { status: "success", chapter: newChapter },
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
    const chapterId = searchParams.get("chapterId");

    if (!chapterId) {
      return NextResponse.json(
        {
          status: "error",
          error: "chapterId is required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();
    await Chapter.deleteOne({ _id: chapterId });
    await Question.deleteMany({ chapter: chapterId });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
