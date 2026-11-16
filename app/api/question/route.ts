import { recheckSchedulesForQuestion } from "@/lib/recheck";
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbUtils";
import { jsonRevalidated } from "@/lib/httpCache";
import Question, { TQuestion } from "@/models/Question";
import "@/models/Chapter";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chapter = searchParams.get("chapter");
    const limit = Number(searchParams.get("limit") || 10);
    const page = Number(searchParams.get("page") || 1);
    const marks = Number(searchParams.get("marks"));
    const questionId = searchParams.get("questionId");
    const tag = searchParams.get("tag");
    const timesUsed = searchParams.get("timesUsed");

    const query: any = {
      chapter: chapter,
    };
    if (marks) query.mark = marks;
    if (tag) query.tags = tag;
    if (timesUsed != undefined) query.timesUsed = timesUsed
    // if (chapter) query.chapter = chapter;

    await dbConnect();

    if (questionId) {
      const question = await Question.findById(questionId)
        .populate("chapter", {
          subject: 1,
          course: 1,
          title: 1,
        })
        .exec();
      return NextResponse.json(
        {
          status: "success",
          questions: [question],
          totalPages: 1,
          totalQuestions: 1,
          currentPage: 1,
        },
        { status: 200 }
      );
    }

    // The page and the total are independent: one round trip instead of two
    const [questions, totalQuestions] = await Promise.all([
      Question.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .populate("chapter", {
        subject: 1,
        course: 1,
        title: 1,
      })
        // Nothing here needs Mongoose documents, only their JSON
        .lean(),
      Question.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalQuestions / limit);

    // Revisiting a page of questions is common and the list rarely changes
    // between visits, so an unchanged page answers 304 instead of resending it
    return jsonRevalidated(request, {
      status: "success",
      questions: questions,
      totalPages,
      totalQuestions,
      currentPage: page,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const { ans, chapter, text } = (await request.json()) as TQuestion;

    if (!ans || !chapter || !text) {
      return NextResponse.json(
        {
          status: "error",
          error: "All fields are required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const newQuestion = new Question({ ans, chapter, text });

    await newQuestion.save();

    return NextResponse.json(
      { status: "success", question: newQuestion },
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
    const { id, ans, mark, text, tags } = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          status: "error",
          error: "question id is required.",
        },
        { status: 500 }
      );
    }

    await dbConnect();

    const questionObj: TQuestion = {};
    if (ans) questionObj.ans = ans;
    if (text) questionObj.text = text;
    if (mark) questionObj.mark = mark;
    if (tags) questionObj.tags = tags;

    // Returns the question as it was before the update.
    const question = await Question.findByIdAndUpdate(id, questionObj);

    // A corrected answer key (or changed marks / numerical tag) must reach the
    // tests already marked with the old one: results, ranks and student
    // insights read the stored verdicts. Reported as a count, never fatal.
    let retested = 0;
    const keyChanged =
      question &&
      ((ans && ans !== question.ans) ||
        (mark && mark !== question.mark) ||
        (tags && JSON.stringify(tags) !== JSON.stringify(question.tags ?? [])));
    if (keyChanged) {
      try {
        retested = await recheckSchedulesForQuestion(String(id));
      } catch (err) {
        console.error("re-marking after answer change failed", err);
      }
    }

    return NextResponse.json(
      { status: "success", question: question, retested },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", error: err.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
};
