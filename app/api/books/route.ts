import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Book, { TBook } from "@/models/Book";
import { nextError, nextSuccess } from "@/lib/nextUtils";

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

    return nextSuccess({ books }, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const { title, course, subject } = (await request.json()) as TBook;

    if (!course || !subject || !title) {
      return nextError("All fields are required.", 400);
    }

    await dbConnect();

    const newBook = await Book.create({ title, subject, course });

    return nextSuccess({ book: newBook }, 201);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { id, title } = await request.json();

    if (!id || !title) {
      return nextError("All fields are required.", 400);
    }

    await dbConnect();
    const updatedBook = await Book.findByIdAndUpdate(id, { title }, { new: true });

    return nextSuccess({ book: updatedBook }, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return nextError("id is required.", 400);
    }

    await dbConnect();
    await Book.deleteOne({ _id: id });

    return nextSuccess(null, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};
