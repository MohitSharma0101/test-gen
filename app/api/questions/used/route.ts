import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Question, { TQuestion } from "@/models/Question";

export const POST = async (request: NextRequest) => {
  try {
    // The client sends ids. Full question objects are still accepted so an
    // older tab that is still open keeps working.
    const { ids, questions } = (await request.json()) as {
      ids?: string[];
      questions?: TQuestion[];
    };

    const questionIds = (ids?.length ? ids : questions?.map((q) => q._id) ?? []).filter(
      Boolean
    );

    if (questionIds.length <= 0) {
      return NextResponse.json(
        {
          status: "error",
          error: "Must have at least one question.",
        },
        { status: 500 }
      );
    }

    await dbConnect();
    // Define the filter using the list of question IDs
    const filter = { _id: { $in: questionIds } };

    // Perform the update operation
    const result = await Question.updateMany(filter, {
      $inc: { timesUsed: 1 },
    });

    return NextResponse.json(
      { status: "success", questions: result },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
