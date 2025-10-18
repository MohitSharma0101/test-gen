import { dbConnect } from "@/lib/dbUtils";
import Paper, { TPaper } from "@/models/Paper";
import { NextRequest, NextResponse } from "next/server";
import "@/models/Chapter";
import "@/models/Question";
import { TChapter } from "@/models/Chapter";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { PaperStatus } from "@/data/const";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const author = searchParams.get("author");
    const course = searchParams.get("course");
    const limit = Number(searchParams.get("limit") || 10);
    const page = Number(searchParams.get("page") || 1);
    const status = searchParams.get("status") as PaperStatus | undefined;

    const query: any = {};
    if (id) query._id = id;
    if (author) query.author = author;
    if (course) query.course = course;
    if (status) query.status = status;

    await dbConnect();
    const papers = await Paper.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .populate({
        path: "questions",
        populate: {
          path: "chapter",
          model: "Chapter",
        },
      })
      .lean();

    const totalPapers = await Paper.countDocuments(query);
    const totalPages = Math.ceil(totalPapers / limit);

    return nextSuccess({
      status: "success",
      papers: papers,
      totalPages,
      totalPapers,
      currentPage: page,
    });
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const { id, title, questions, author, status } = (await request.json()) as TPaper;

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
    const course = (questions?.[0]?.chapter as TChapter)?.course;
    const questionsIds = questions.map((q) => q._id);

    const paperObj = { title, questions: questionsIds, author, course, status };

    if (id) {
      const paper = await Paper.findByIdAndUpdate(id, paperObj);
      return NextResponse.json(
        { status: "success", question: paper },
        { status: 201 }
      );
    } else {
      const paper = new Paper(paperObj);
      await paper.save();

      return NextResponse.json(
        { status: "success", question: paper },
        { status: 201 }
      );
    }
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
