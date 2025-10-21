import { dbConnect } from "@/lib/dbUtils";
import { NextRequest } from "next/server";
import "@/models/Chapter";
import "@/models/Question";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import Paper, { TPaper } from "@/models/Paper";

export const PUT = async (request: NextRequest) => {
  try {
    const { paperIds, title, author, status } = (await request.json());

    if (!title || !author || !status) {
      return nextError("Title, author and status is mandatory.");
    }

    if (!Array.isArray(paperIds) || paperIds.length < 2) {
      return nextError("At least two papers required to merge");
    }

    await dbConnect();
    const papers = await Paper.find({ _id: { $in: paperIds } }).lean<TPaper[]>();

    const questionSet = new Set<string>();
    papers.forEach((paper) => {
      paper.questions.forEach((qId) => {
        questionSet.add(qId.toString());
      });
    });

    const uniqueQuestionIds = Array.from(questionSet);
    const course = papers?.[0].course

    const newPaper = await Paper.create({
      title,
      author,
      status,
      course,
      questions: uniqueQuestionIds,

    });

    return nextSuccess({ paper: newPaper });

  } catch (err: any) {
    return nextError(err);
  }
};