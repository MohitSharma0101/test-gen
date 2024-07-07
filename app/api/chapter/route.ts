import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Chapter, { TChapter } from "@/models/Chapter";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const course = searchParams.get("course");
    const subject = searchParams.get("subject");

    const query: any = {};
    if (course) query.course = course;
    if (subject) query.subject = subject;
    
    await dbConnect();
    const chapters = await Chapter.find(query);

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
    const { course, subject, title } = (await request.json()) as TChapter;

    if (!course || !subject || !title) {
      return NextResponse.json(
        {
          status: "error",
          error: "All fields are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const newChapter = new Chapter({ course, subject, title });

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
