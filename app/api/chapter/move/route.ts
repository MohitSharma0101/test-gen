import { dbConnect } from "@/lib/dbUtils";
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

        const result = await Chapter.updateMany(
            { _id: { $in: ids } }, // Find chapters with IDs in the provided list
            { $set: { book: book } } // Update the book field to newBookId
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
