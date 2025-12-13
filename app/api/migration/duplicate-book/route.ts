import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { duplicateBook } from "./duplicate-book";

export const POST = async (req: Request) => {
  try {
    await dbConnect();

    const body = await req.json();
    const { bookId, destCourseId, destSubjectId } = body;

    if (!bookId || !destCourseId || !destSubjectId) {
      return NextResponse.json(
        {
          status: "error",
          error: "bookId, destCourseId and destSubjectId are required",
        },
        { status: 400 }
      );
    }

    const result = await duplicateBook({
      sourceBookId: bookId,
      destinationCourse: destCourseId,
      destinationSubject: destSubjectId,
    });

    return NextResponse.json(
      {
        status: "success",
        message: "Book duplicated successfully",
        data: result,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err.message ?? "Something went wrong",
      },
      { status: 500 }
    );
  }
};
