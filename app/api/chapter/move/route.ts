import { dbConnect } from "@/lib/dbUtils";
import Book, { TBook } from "@/models/Book";
import Chapter from "@/models/Chapter";
import { NextRequest, NextResponse } from "next/server";

export const PUT = async (request: NextRequest) => {
    try {
        const { ids, book } = await request.json();

        if (!ids || !book) {
            return NextResponse.json(
                {
                    status: "error",
                    error: "All fields are required.",
                },
                { status: 500 }
            );
        }
        await dbConnect();

        const bookDetails = await Book.findById(book) as TBook;

        const result = await Chapter.updateMany(
            { _id: { $in: ids } }, // Find chapters with IDs in the provided list
            {
                $set: {
                    book: bookDetails._id,
                    subject: bookDetails.subject,
                    course: bookDetails.course
                }
            } // Update book details

        );

        return NextResponse.json(
            { status: "success", chapters: result },
            { status: 201 }
        );

    } catch (err: any) {
        return NextResponse.json(
            { status: "error", error: err.message ?? "Something went wrong" },
            { status: 500 }
        );
    }
};
