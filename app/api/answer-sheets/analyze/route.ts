import { QuestionAnalyze } from "@/data/const";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { analyzeQuestions } from "@/lib/test-utils";
import AnswerSheet, { TAnswerSheet } from "@/models/AnswerSheet";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const scheduleId = searchParams.get("scheduleId");
        const threshold = Number(searchParams.get("threshold"));
        const analyzeOn = searchParams.get("analyzeOn") as QuestionAnalyze ?? QuestionAnalyze.INCORRECT;

        if (!scheduleId) {
            return nextError("Schedule Id is required");
        }
        await dbConnect();

        const answerSheets = await AnswerSheet.find({
            schedulePaper: scheduleId,
        }).populate({
            path: "answers.question",
            populate: {
                path: "chapter",
                select: 'title cousre subject _id'
            }
        }).lean<TAnswerSheet<true>[]>();

        const analyzedQuestions = analyzeQuestions(
            answerSheets,
            {
                threshold,
                analyzeOn,
            }
        );

        return nextSuccess({ analyzedQuestions })
    } catch (err) {
        console.error(err);
        return nextError();
    }
}