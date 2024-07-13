import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Book, { TBook } from "@/models/Book";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const course = searchParams.get("course");
    const subject = searchParams.get("subject");

    const query: any = {};
    if (course) query.course = course;
    if (subject) query.subject = subject;

    await dbConnect();
    const books = await Book.find(query);

    return NextResponse.json(
      { status: "success", books: books },
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
    const { title, course, subject } = (await request.json()) as TBook;

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

    const newBook = new Book({ title, subject, course });

    await newBook.save();

    return NextResponse.json(
      { status: "success", book: newBook },
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
    const { id, title } = await request.json();

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

    const newBook = await Book.findByIdAndUpdate(id, { title: title });

    return NextResponse.json(
      { status: "success", book: newBook },
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
    await Book.deleteOne({ _id: id });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
