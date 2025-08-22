import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import Question, { TQuestion } from "@/models/Question";
import { nextError, nextSuccess } from "@/lib/nextUtils";

export const POST = async (request: NextRequest) => {
  try {
    const { questions } = await request.json();

    if (!questions || questions?.length <= 0) {
      return nextError("All fields are required.", 400);
    }

    await dbConnect();
    await Question.insertMany(questions);

    return nextSuccess(null, 201);
  } catch (err: any) {
    return nextError(err.message);
  }
};

export const PATCH = async (request: NextRequest) => {
  try {
    const { questions } = await request.json();

    if (!questions || questions?.length <= 0) {
      return nextError("All fields are required.", 400);
    }

    await dbConnect();
    const questionsIds = questions.map((q: TQuestion) => q._id);
    await Question.deleteMany({ _id: { $in: questionsIds } });

    return nextSuccess(null, 200);
  } catch (err: any) {
    return nextError(err.message);
  }
};
